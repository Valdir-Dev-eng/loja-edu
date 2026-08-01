# Planta Arquitetural — loja-edu

## Papel deste documento

`RegrasDeDesenvolvimento.md` diz **como** quem for codar deve construir cada peça — é o manual do pedreiro. Este documento aqui é a planta do engenheiro: diz **o que falta existir**, **em que ordem** e **por quê**. Não tem uma linha de código nem exemplo de código. Quando chegar a hora de construir cada parte, o trabalho de programar vem depois, guiado por este documento + pelas regras do outro.

---

## 1. Diagnóstico do estado atual

Nota geral estimada: **~15% do que um e-commerce real, seguro e operando (com pagamento, frete, imagem em CDN, borda protegida e mensageria) precisa ser.**

Isso não é um julgamento sobre a qualidade do que existe — o esqueleto de código (padrão, camadas, DI) está bem mais avançado que o resto, só que ele é a parte mais fácil de acertar. A parte difícil (dinheiro entrando, frete calculado certo, segurança de borda, dado sensível protegido) ainda não começou.

| Área | Nota | Evidência / motivo |
|---|---|---|
| Padrão de código / esqueleto interno | 75% | Camadas, contratos (Port), DI, Module e Router seguem um padrão único e repetido — é a base mais pronta do projeto. Documentado em `RegrasDeDesenvolvimento.md`. |
| Entidades de domínio | 20% | `Product`, `Order`, `User` guardam pouco mais que os campos de um CRUD de estudo: sem categoria, sem imagem, sem endereço, sem status de pagamento/frete, preço como texto (`string`) em vez de valor monetário. |
| Autenticação | 25% | Cadastro/login manual funciona (hash Argon2id, JWT de acesso/refresh, verificação de e-mail), mas não existe login social, não existe limite de tentativa de login, e a estratégia de sessão não tem camada de borda. |
| Catálogo (produto) | 15% | CRUD simples de produto. Sem categoria, sem imagem, sem busca, sem paginação, sem controle de status (ativo/inativo/sem estoque). |
| Pedido | 20% | Cria, cancela, lista e busca pedido; baixa estoque na hora de criar. Sem pagamento de verdade, sem cálculo de frete, sem proteção contra pedido duplicado (idempotência), sem limite de requisição. |
| Pagamento (Mercado Pago) | 0% | Não existe nenhuma integração de pagamento. Hoje um pedido nasce "pago" apenas por criação, sem cobrança real. |
| Frete (Correios) | 0% | Não existe endereço de origem/destino nem cálculo de frete em lugar nenhum do código. |
| Imagens (Sirv) | 0% | `Product` nem tem campo para imagem hoje. |
| Rate limiting | 0% | Nenhum middleware de limite de requisição existe — nem global, nem na criação de pedido. |
| Borda (Cloudflare WAF + Workers) | 0% | Nenhuma configuração de borda existe; a aplicação hoje espera receber tráfego direto. |
| Mensageria (RabbitMQ) | 0% | O envio de e-mail de verificação hoje é síncrono, dentro do próprio Controller — trava a resposta HTTP até o SMTP responder. |
| Infra / Deploy (Docker + VPS) | 0% | Não existe `Dockerfile` nem `docker-compose` no projeto. Hoje a única forma de rodar é `tsx src/main.ts` local. |
| Observabilidade / Testes | 0% | Não há suíte de teste automatizado nem log estruturado — só `console.log` espalhado, inclusive esquecido em código de produção (já listado em "Débitos conhecidos" no outro documento). |

---

## 2. Sua pergunta: dá pra fazer tudo de uma vez, mesmo num plano PRO?

Não, e não é sobre limite de mensagem — é sobre risco. Cada peça nova (pagamento, frete, borda, fila) *depende* de uma decisão de domínio que ainda não foi tomada (que campo o `Order` precisa ter pra saber se foi pago? o endereço mora no `User` ou no `Order`?). Se tudo for atacado ao mesmo tempo, qualquer decisão errada tomada cedo se espalha para todas as integrações que vêm depois, e ninguém consegue revisar uma entrega gigante com confiança — principalmente numa área que mexe com dinheiro real de terceiros.

O caminho seguro é: uma fatia de cada vez, cada uma terminando em algo que roda e é revisável sozinho, na ordem certa de dependência (seção 4). Isso também é o que rende melhor sessão a sessão: cada fase vira um bloco de trabalho fechado.

---

## 3. Por que a ordem importa (o que trava o quê)

- **Entidades primeiro.** Pagamento precisa que `Order` já saiba representar um ciclo de status de pagamento. Frete precisa que exista endereço. Imagem precisa que `Product` já tenha onde guardar a referência. Sem redesenhar o domínio, toda integração nova vai forçar um remendo em cima de uma entidade que não foi pensada pra aguentar aquilo.
- **Autenticação vem antes de mexer em dinheiro.** Faz sentido endurecer login (Google, limite de tentativa) antes de o sistema começar a processar pagamento de verdade — é a mesma pessoa, com os mesmos dados, que agora também vai ter cartão/PIX envolvido.
- **Pagamento e frete dependem do catálogo estar minimamente maduro.** Não dá pra calcular frete de um produto sem peso/dimensão, nem pra vender algo sem imagem numa loja real.
- **Mensageria é reorganização, não recurso novo.** RabbitMQ só faz sentido depois de já existir mais de uma coisa "lenta" acontecendo dentro de um Controller (hoje é só e-mail; com pagamento/frete vai ter webhook, notificação, atualização de estoque assíncrona — aí sim compensa tirar isso do caminho síncrono).
- **Borda e deploy fecham o ciclo.** Cloudflare (WAF + Workers) e Docker/VPS protegem e hospedam o que já existe — não tem o que proteger/hospedar de verdade enquanto o núcleo (domínio, pagamento, frete) ainda não está pronto.

---

## 4. O que cada peça nova representa (sem código, só o papel dela na planta)

### Entidades (fundação — mexe em tudo que vem depois)

O exemplo que você deu do `Product` (com `Money`, imagem, categoria, status, metadata) é o tipo de mudança que precisa acontecer nas três entidades centrais, não só numa:

- **Product**: hoje é um cadastro raso (nome, preço em texto, desconto, estoque). Precisa passar a existir: um tipo de valor monetário de verdade (não texto), vínculo com categoria, uma lista de imagens (referência, não arquivo), um status de ciclo de vida (ativo/inativo/sem estoque) em vez de só existir/não existir, e um espaço livre pra dado que muda por tipo de produto (metadata).
- **Category**: não existe hoje. Precisa nascer como conceito próprio (não como texto solto dentro de `Product`), porque `Product` vai referenciar categoria por id.
- **ProductImage**: não existe hoje. É o conceito que vai guardar a referência da imagem hospedada no Sirv (não o arquivo em si) — ordem de exibição, texto alternativo, etc.
- **Order**: hoje o status é só um enum simples (`PENDING/PAID/SHIPPED/CANCELLED`) setado na mão. Precisa virar um ciclo de vida de verdade que reflita pagamento (aguardando pagamento, pago, recusado, estornado) e frete (calculado, a caminho, entregue) — e guardar a referência externa do pagamento (id que o Mercado Pago devolve) e o endereço de entrega usado no cálculo de frete.
- **User**: hoje não tem endereço nem vínculo com um provedor de login externo. Precisa ganhar isso pra suportar Google OAuth (um identificador vindo do Google) e frete (endereço de entrega).

### Autenticação com Google (+ verificação na borda)

- O login com Google **não substitui o backend de autenticação** — ele troca só *como* a identidade da pessoa é confirmada (em vez de senha própria, uma confirmação da Google). O restante do fluxo (gerar token de sessão, revogar token, etc.) continua sendo responsabilidade do seu backend, do mesmo jeito que já é hoje pro login manual.
- O papel do **Cloudflare Worker** aqui é diferente: ele não decide identidade, ele *verifica* uma sessão já emitida, rodando na borda (fisicamente mais perto do usuário que sua VPS), antes da requisição sequer chegar no seu servidor. Serve pra rejeitar rápido quem não tem sessão válida, sem gastar recurso do seu backend com isso.
- Decisão que falta tomar: o login manual (e-mail/senha) que já existe vai continuar existindo em paralelo ao Google, ou vai ser desativado? Isso muda o tamanho da mudança em cima do que já existe.

### Pagamento (Mercado Pago)

- É a peça que de fato tira a dependência da taxa de 50% de uma plataforma terceira — é o motivo central do projeto existir.
- Ela força o pedido a ter um ciclo de vida de pagamento real (aguardando, aprovado, recusado, estornado) e a existência de um endpoint que recebe confirmação do Mercado Pago de forma assíncrona (o pagamento pode ser aprovado minutos depois da compra, não na hora). Esse endpoint é público por natureza (o Mercado Pago que chama ele, não o seu frontend), então ele carrega um risco de segurança próprio: precisa confirmar que quem chamou foi realmente o Mercado Pago, não só confiar no corpo da requisição.

### Frete (Correios)

- Calcula prazo e custo real de entrega antes do pedido fechar — sem isso, hoje qualquer "frete" seria um valor inventado.
- Depende de três coisas que não existem ainda: endereço de origem (de onde a loja despacha), endereço de destino (do cliente) e peso/dimensão de cada produto.

### Imagens (Sirv)

- Tira do seu próprio servidor a responsabilidade de guardar e servir arquivo de imagem — sua aplicação passa a guardar só a referência (endereço da imagem), nunca o arquivo.
- Só faz sentido depois que `Product` já tiver onde guardar essa referência (é por isso que entra na Fase 0/2, não isolado).

### Rate limiting na criação de pedido

- É diferente de firewall — é uma regra da própria aplicação, pra impedir que uma pessoa (ou um script) crie pedidos em sequência muito rápida e explore estoque/pagamento.
- Encaixa no mesmo formato que já existe hoje pros validators de rota: mais um middleware de Router, só que em vez de validar formato de dado, ele conta tentativa (apoiado em algo como o Redis que já está no projeto).

### Cloudflare WAF + Workers (borda)

- **WAF**: não é código seu — é uma configuração na Cloudflare, na frente do seu domínio, filtrando tráfego malicioso antes dele sequer chegar na sua VPS.
- **Workers**: código que roda no ambiente da Cloudflare (fora do seu servidor Node), usado aqui pra verificação leve de sessão antes da requisição entrar na sua aplicação. Não substitui nada do backend — é uma camada a mais, na frente.

### RabbitMQ (mensageria)

- Hoje o envio de e-mail de verificação acontece dentro do próprio `Controller`, na hora — a resposta HTTP do cadastro só volta depois do SMTP responder. Isso já é uma fragilidade, e vai piorar quando existir webhook de pagamento, atualização de estoque, notificação de frete acontecendo ao mesmo tempo.
- RabbitMQ entra como o lugar pra onde essas tarefas "que não precisam responder na hora" são publicadas, sendo processadas por um processo separado (um "worker"), sem travar a resposta da requisição original.

### Docker + VPS (empacotamento)

- É juntar aplicação Node + Postgres + Redis + RabbitMQ num único `docker-compose`, pra conseguir subir (e atualizar) tudo de forma consistente numa VPS.
- Cloudflare (WAF + Workers) **não entra no Docker** — ela roda na rede da própria Cloudflare, na frente da sua VPS, não dentro dela.

---

## 5. Roteiro em fases (a ordem proposta)

| Fase | Conteúdo | Por que nessa posição |
|---|---|---|
| 0 | Redesenho de `Product`, `Order`, `User` + `Category` + `ProductImage` como conceitos | Fundação — toda integração depois depende de onde o dado vai morar |
| 1 | Login com Google + decisão sobre o login manual atual | Segurança de identidade antes de qualquer coisa envolver dinheiro |
| 2 | Catálogo completo: categoria + imagem (Sirv) sobre as entidades já novas | Só faz sentido vender algo com imagem/categoria antes de cobrar por ele |
| 3 | Pagamento (Mercado Pago) + ciclo de status do pedido + webhook | O motivo central do projeto |
| 4 | Frete (Correios) + endereço em `User`/`Order` | Depende do pedido/pagamento já estarem estáveis |
| 5 | Rate limiting na criação de pedido + revisão geral de erro/validação | Endurecimento depois que o fluxo principal já roda de ponta a ponta |
| 6 | RabbitMQ tirando e-mail/notificação/webhook do caminho síncrono | Só compensa depois de existir mais de uma tarefa "lenta" no fluxo |
| 7 | Cloudflare WAF + Workers + Docker/VPS | Protege e hospeda o que já está pronto — não antes disso |

Cada fase termina em algo que roda sozinho e pode ser revisado antes de abrir a próxima — é assim que um projeto desse tamanho cabe em sessões de trabalho, em vez de virar uma mudança gigante e arriscada de uma vez só.

---

## 6. Decisões que só você pode tomar antes da Fase 0 começar

- O login manual (e-mail/senha) que já existe vai conviver com o Google, ou o Google substitui ele?
- Categoria de produto é hierárquica (categoria dentro de categoria) ou uma lista plana?
- O pedido vai aceitar pagamento parcelado/parcial? Isso muda quantos estados o ciclo de vida do `Order` precisa ter.
- A loja tem um único endereço de origem (despacho), ou mais de um ponto? Isso muda o cálculo de frete.

Sem essas respostas, a Fase 0 (redesenho de entidade) fica incompleta, porque justamente é ela que precisa refletir esses decisões nos campos.