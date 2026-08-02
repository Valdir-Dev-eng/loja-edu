# Plano — Cache-Aside, Rate Limit e Eficiência de Queries

Relatório do que será implementado para suportar alta concorrência sem penalizar navegação legítima. Cobre duas frentes que se compõem: (1) quando usar Redis vs rate limit por rota, (2) eficiência real das queries/conexões Postgres em escala. Nenhum código foi alterado ainda — este documento é o plano de execução.

---

## 1. Matriz de decisão (rate limit vs cache-aside)

Para cada rota, três perguntas:

- **P1** — pública, resposta igual para qualquer usuário?
- **P2** — privada (autenticada), lê/escreve dados de um usuário específico?
- **P3** — tem lógica que pesa CPU/banco (loop, N+1, múltiplos use cases)?

| P1 | P2 | P3 | Cenário | Resolução |
|---|---|---|---|---|
| Sim | Não | Sim/Não | **1** | Só Redis (cache-aside). Sem rate limit restritivo. |
| Não | Sim | Sim/Não | **2** | Rate limit + cache leve pra dado imutável do contexto. |
| Não | Não | Sim | **3** | Rate limit estrito. |
| Não | Não | Não | **4** | Rota pública sem proteção rígida. |

---

## 2. Auditoria das 30 rotas registradas

Rastreadas router → controller → use case → repositório/cache, uma a uma.

| Rota | Auth | P1 | P2 | P3 | Cenário | Estado atual | Ação |
|---|---|---|---|---|---|---|---|
| GET /product/ | Não | Sim | Não | Não | 1 | ✅ cache-aside + sem rate limit | nenhuma |
| GET /categories | Não | Sim | Não | Não | 1 | ✅ cache-aside + sem rate limit | nenhuma |
| **GET /product/:id** | Não | Sim | Não | Não | **1** | ❌ sem cache, tier `AUTHENTICATED_READ` | **cache-aside + remover rate limit** |
| **GET /product/:id/images** | Não | Sim | Não | Não | **1** | ❌ sem cache, tier `AUTHENTICATED_READ` | **cache-aside + remover rate limit** |
| POST /webhooks/mercadopago | Não (assinatura) | — | Não | Não | isento | ✅ sem rate limit, protegido por assinatura | nenhuma |
| GET /callback/melhor/envio | Não (state cookie) | Não | Não | Não | 4 | tier OAUTH | ok |
| POST /shipping/quote | Não | Não | Não | Sim (API paga) | 3 | tier `PAID_EXTERNAL_CALL` | ok |
| GET /auth/google(+callback) | Não | Não | Não | Não | 4 | tier OAUTH | ok |
| GET /auth/me | Sim | Não | Sim | Não | 2 | tier `AUTHENTICATED_READ` | ok + cache leve de perfil (§4) |
| POST /auth/logout | Sim | Não | Sim | Não | 2 | tier `AUTHENTICATED_READ` | ok |
| POST /auth/onboarding | Sim | Não | Sim | Não | 2 | tier `GENERIC_WRITE` | ok |
| GET /addresses/my | Sim | Não | Sim | Não | 2 | tier `AUTHENTICATED_READ` | ok |
| POST /addresses | Sim | Não | Sim | Não | 2 | tier `GENERIC_WRITE` | ok |
| DELETE /addresses/:id | Sim | Não | Sim | Não | 2 | tier `GENERIC_WRITE` | ok |
| POST/PUT/DELETE /product/(:id) (admin) | Sim+admin | Não | Sim | Não | 2 | tier `GENERIC_WRITE` | ok |
| POST /order/checkout | Sim | Não | Sim | Sim (gateway pago + N+1) | 2 | tier `PAID_EXTERNAL_CALL` | ok; N+1 tratado na Parte 2 |
| GET /order/my | Sim | Não | Sim | Não | 2 | tier `AUTHENTICATED_READ` | ok |
| GET /order/:id/payment-status | Sim | Não | Sim | Sim (gateway pago a cada poll) | 2 | tier `AUTHENTICATED_READ` | ok; validar intervalo real de polling do front |
| GET /admin/orders | Sim+admin | Não | Sim | Sim (N+1 comprador) | 2 | tier `AUTHENTICATED_READ` | ok pra rate limit; N+1 tratado na Parte 2 |
| GET /admin/users | Sim+admin | Não | Sim | Não | 2 | tier `AUTHENTICATED_READ` | ok |
| GET /dev/promote-me | Sim (dev) | Não | Sim | Não | 2 | tier `GENERIC_WRITE` | ok |
| POST /categories | Sim+admin | Não | Sim | Não | 2 | tier `GENERIC_WRITE` | ok |
| POST/DELETE /admin/products/:id/images | Sim+admin | Não | Sim | Não | 2 | tiers pago+upload | ok |
| GET /admin/melhor-envio/connect | Sim+admin | Não | Sim | Não | 2 | tier OAUTH | ok |
| POST /admin/orders/:id/purchase-label | Sim+admin | Não | Sim | Sim (loop + gateway pago) | 2 | tier `PAID_EXTERNAL_CALL` | ok |
| GET /admin/orders/:id/label-print-link | Sim+admin | Não | Sim | Não | 2 | tier `PAID_EXTERNAL_CALL` | ok |

**Conclusão:** só 2 rotas violam a matriz — as duas rotas públicas de produto individual, classificadas como se fossem autenticadas. É a causa confirmada do cliente sendo bloqueado ao recarregar a página de produto, e também quebra a própria Home (que busca imagem de vários produtos em paralelo).

---

## 3. Eficiência das queries e conexões (visão de larga escala)

### 3.1 Achado 0 (maior impacto) — conexão nova a cada query

`PostgresDataAccess.executeQuery` cria um client Postgres (`max: 1`) e fecha (`sql.end()`) em **toda** chamada — `findOne`, `findMany`, `count`, `create`, `update`, `remove`. Nenhuma reutilização, nem dentro da mesma requisição. A conexão também é **direta** ao Postgres (`db.<ref>.supabase.co`), sem passar pelo pooler do Supabase — cada chamada paga handshake TCP+TLS+auth completo pela internet.

**Estratégia (padrão da lib `postgres`):** client único, criado uma vez, com pool interno (`max: 10–20`), reutilizado pela vida do processo. Retry cobre a query que falhou, não recria a conexão inteira.

### 3.2 Achado 1 — N+1 em três pontos, todos multiplicados pelo Achado 0

- `OrderRepository.hydrate()`: uma query de itens por pedido.
- `ListOrdersForAdmin`: busca todos os pedidos sem filtrar status no SQL (filtra em JS) + uma query de comprador por pedido → **2N+1 conexões** para N pedidos.
- `CheckoutOrder`: busca cada produto do carrinho duas vezes (`buildItems` e `decrementStock`).

**Estratégia:** lote via `WHERE id = ANY($1)`. Exige estender `DataAccessPort`/`RepositoryPort` com uma operação de busca por lista de ids (não existe hoje — só igualdade exata por campo).

### 3.3 Achado 2 — índice dormente

`produtos.categoria_id` tem índice definido na migration 0004 mas **não existe no banco real** (conferido via `pg_indexes`, não só pela migration). Sem uso ativo hoje (filtro de categoria é client-side), mas barato criar agora e caro depois.

### 3.4 Achado 3 (herdado da auditoria de rotas) — cache leve de perfil

`GetAuthenticatedUser` roda a cada requisição autenticada (dentro de `requireSession`) e sempre bate no Postgres. Candidato natural a cache curto (Cenário 2).

---

## 4. O que vai ser implementado, em ordem

1. **Client Postgres único e reutilizado** em `PostgresDataAccess` — base de tudo, maior impacto isolado.
2. **Trocar para o connection pooler do Supabase** (pendente: você me passar a connection string do pooler, já pedi antes e não tinha na ocasião).
3. **Cache-aside em `GetProductById` e `ListProductImages`** + remover as duas rotas do rate limit (`tiers: []` em `RateLimitRouteRules.ts`), com invalidação no update/delete de produto e no upload/delete de imagem.
4. **Estender `DataAccessPort`/`RepositoryPort`** com busca em lote por ids.
5. **Resolver os N+1**: `OrderRepository.hydrate`, `ListOrdersForAdmin` (+ filtrar status no SQL), `CheckoutOrder` (elimina a busca duplicada de produto).
6. **Criar o índice** em `produtos.categoria_id`.
7. **Cache curto de perfil autenticado** (`GetAuthenticatedUser`), invalidado em update de usuário/onboarding.

## 5. Critério de aceite

- `npm run build` limpo, `npm test` verde (número de testes informado).
- Teste de concorrência real (`Promise.all`) provando que `GET /product/:id` e `/product/:id/images` não bloqueiam mais sob rajada.
- `git diff --stat` mostrando exatamente os arquivos tocados por item da seção 4.
- Commit + push por item concluído (§0 do `RegrasDeDesenvolvimentoRefinado.md`), nunca um commit único pra tudo.
