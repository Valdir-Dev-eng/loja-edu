# Regras de Desenvolvimento Refinado — loja-edu

Este documento **substitui** o `RegrasDeDesenvolvimento.md` anterior. Ele contém todo o padrão que já existe no código (inalterado onde já funcionava) **mais** duas disciplinas que já eram obrigatórias — **tratamento de erros específico** (§10) e **testes automatizados** (§11), com a regra de proporção do §12 — **mais uma regra fundamental, acima de todas as outras: versionamento obrigatório (§0)**, criada depois de uma perda real de trabalho por falta disso.

Qualquer IA que for **codar** este projeto deve seguir exatamente o que está aqui, sem introduzir estilos novos, sem "melhorar" a estrutura por conta própria, sem trocar convenções.

Qualquer IA que for **supervisionar** outra IA codando deve usar este documento como checklist de aceite: se o código gerado não seguir uma regra daqui — incluindo o commit/push do §0 e a proporção de teste/erro do §12 — deve ser rejeitado e corrigido antes de seguir em frente.

Este documento **não** define o nome do estilo arquitetural do projeto. Ele define o **padrão de código**: onde cada coisa mora, como cada peça se chama, o que cada peça pode ou não fazer, como cada erro é representado, como cada comportamento é provado por teste, e como o trabalho é salvo.

---

## 0. Regra fundamental — versionamento obrigatório (acima de qualquer outra regra deste documento)

**Contexto que criou esta regra:** uma versão anterior deste projeto foi perdida por completo — HD com falha, sem nenhum commit recente — porque o trabalho foi feito sessão após sessão sem `git push`. Esta regra existe para que isso nunca aconteça de novo. Ela é a mais importante do documento inteiro; nenhuma entrega está "pronta" sem ela, não importa quão bom o código esteja.

- **A cada tarefa concluída com sucesso** (uma fatia, uma correção, uma entrega inteira — qualquer unidade de trabalho que termine com gate verde: `tsc` limpo + `vitest run` passando), a IA que codou **precisa**, sem exceção e sem esperar ser lembrada:
  ```
  git add .
  git commit -m "<mensagem descrevendo a fatia/correção entregue>"
  git push
  ```
  na branch do dono do projeto — nunca deixar trabalho terminado sem commit e sem push.

- **Claude/qualquer IA NUNCA aparece como contribuidor do repositório.** Isso significa, sem exceção:
  - Nenhum trailer `Co-authored-by: Claude <...>` (ou equivalente de qualquer outra IA) em nenhuma mensagem de commit.
  - O autor do commit (`git config user.name` / `user.email`) é sempre a identidade do dono do projeto, nunca uma identidade separada da IA.
  - Se a ferramenta de código (Claude Code ou qualquer outra) tiver algum comportamento padrão de assinar commits como colaborador, esse comportamento precisa ser desativado antes do primeiro commit da sessão — não é opcional, é bloqueante.

- **Consequência declarada pelo dono do projeto, para deixar o peso disso claro:** descumprir esta regra (deixar de commitar/dar push, ou aparecer como contribuidor) é motivo para o repositório ser apagado. Não é exagero retórico — é a régua real de aceite.

- Mensagens de commit seguem o mesmo espírito de granularidade já usado nos relatórios de entrega deste projeto (uma fatia = um commit, descrição objetiva do que mudou), não um commit gigante no fim de uma sessão inteira.

- Esta regra vale mesmo em sessão de correção pequena/rápida — "é só um ajuste de CSS" não é desculpa para pular commit e push.

---

## 1. Stack

- TypeScript (`strict: true`), ES2022, módulos ES (`"type": "module"`).
- Express (via adapter próprio, nunca usado direto fora do adapter).
- `postgres` (driver puro, sem ORM) para o banco.
- Redis para cache.
- Zod para validação de schema (por trás de uma camada própria, nunca usado direto nos validators de feature).
- JWT (`jsonwebtoken`) para token, Argon2id para hash de senha, Nodemailer para e-mail, `uuid` para geração de id.
- Execução com `tsx` em dev, build com `tsup`.
- Vitest para testes (unitário e, futuramente, integração). Roda TypeScript ESM direto, sem transpilar antes. Nenhuma outra lib de teste/mocking entra no projeto — dublê de teste é escrito à mão sobre os Ports (§11.4).

---

## 2. Estrutura de pastas

```
src/
  main.ts                          → ponto de entrada único. Só cria AppModule e chama listen().

  domain/                          → regras e contratos puros. NUNCA importa nada de infra/ ou app/.
    entites/                       → entidades (nome da pasta é "entites", mantido assim de propósito — não renomear para "entities")
      Order.ts
      Product.ts
      User.ts
    repository/
      RepositoryPort.ts            → contrato genérico de repositório (abstract class, genérico <T>)
    database/
      DataAcess.ts                 → contrato de acesso a dados cru (DataAccessPort) — nome do arquivo mantido como está
      CachePort.ts                 → contrato de cache
    security/
      PasswordHasher.ts            → contrato de hash de senha
    interface/
      CreateId.ts                  → tipo de função geradora de id (CreateId = () => string)
    errors/                        → taxonomia de erros de negócio (§10)
      AppError.ts                  → abstract class base de todo erro de negócio
      NotFoundError.ts
      ConflictError.ts
      UnauthorizedError.ts
      ForbiddenError.ts
      BusinessRuleError.ts

  app/                             → casos de uso, organizados por feature. Só importa de domain/.
    orders/
      dto/
        OrderInput.ts
        OrderOutput.ts
        OrderSummaryOutput.ts
      useCase/
        CreateOrder.ts
        CancelOrder.ts
        GetOrderById.ts
        ListOrdersByUser.ts
    products/
      dto/
        ProductInput.ts
        ProductOutput.ts
      useCase/
        CreateProduct.ts
        UpdateProduct.ts
        DeleteProduct.ts
        GetProductById.ts
        GetAllProducts.ts
    users/
      dto/
        UserInput.ts
        UserLoginInput.ts
        UserOutput.ts
      useCase/
        CreateUser.ts
        UpdateUser.ts
        DeleteUser.ts
        GetUser.ts
        GetAllUsers.ts
        LoginUser.ts
        VerifyEmail.ts

  infra/                           → tudo que fala com o mundo externo. Pode importar de domain/ e de app/.
    config/                        → 1 classe estática por assunto, lê variável de ambiente
      ConfigEnv.ts                 → wrapper de dotenv, única classe que lê process.env
      ConfigDb.ts
      ConfigDomain.ts
      ConfigEmail.ts
      ConfigToken.ts
      ConfigCache.ts
    pattern/
      DI.ts                        → container de injeção de dependência manual (DependencyInjection)
    module/                        → composition root por feature
      AppModule.ts                 → monta o DI raiz, registra os adapters, cria os módulos de feature
      ProductModule.ts
      UserModule.ts
      OrderModule.ts
      ViewModule.ts
    repository/                    → implementação concreta de RepositoryPort<T>
      ProductRepository.ts
      UserRepository.ts
      OrderRepository.ts
    controller/                    → orquestra use cases, não conhece HTTP
      ProductController.ts
      UserCrudController.ts
      UserAuthController.ts
      OrderController.ts
      ViewController.ts
    routers/                       → dono exclusivo de rota/HTTP
      ProductRouter.ts
      UserCrudRouter.ts
      UserAuthRouter.ts
      OrderRouter.ts
    validators/                    → 1 validator por feature, usa o builder de schema (shared/validators)
      ProductValidator.ts
      UserValidator.ts
      OrderValidator.ts
      Validator.ts                 → abstract genérico legado, hoje nenhum validator concreto o implementa (ver §13)
    shared/
      validators/
        DTOBuilderAndValidator.ts  → contrato do builder de schema (abstract class)
        ZodDTOBuilderAndValidator.ts → implementação concreta com Zod
        IFieldsValidator.ts        → tipos de definição de campo (FieldDefinition e variantes)
      errors/
        ValidationError.ts         → único tipo de erro para falha de validação de DTO
        HttpErrorMapper.ts         → única classe que traduz erro em status HTTP (§10.4)
    server/
      ServerPort.ts                → contrato do servidor HTTP + tipos IRequest/IResponse/middleWare/methodHttp
      ServerExpressAdapter.ts      → implementação concreta com Express
    database/
      PostgresDataAccess.ts        → implementação concreta de DataAccessPort
      RedisCacheAdapter.ts         → implementação concreta de CachePort
    email/
      EmailPort.ts                 → contrato de envio de e-mail
      SmptEmailServiceAdapter.ts   → implementação concreta com Nodemailer (nome do arquivo mantido como está)
    security/
      AuthTokenManager.ts          → contrato de geração/verificação de token (abstract class)
      IAuthTokenManager.ts         → interface auxiliar, hoje só fornece o tipo TokenGenerationOptions (ver §13)
      JsonwebtokenAuthTokenManager.ts → implementação concreta com jsonwebtoken
      ServiceAuthToken.ts          → serviço de alto nível (token + cache de revogação), usado pelos controllers
      Argon2idHasher.ts            → implementação concreta de PasswordHasher
    schema/
      ProductSchema.ts             → schema Zod solto, hoje não conectado ao fluxo de validação (ver §13)
    utils/
      createId.ts                  → implementação concreta de CreateId (uuid v4)

tests/                             → espelha src/ (§11.2)
  doubles/                         → dublês de teste escritos à mão, 1 por Port
    FakeDataAccess.ts
    FakeCachePort.ts
    FakeEmailPort.ts
    FakePasswordHasher.ts
    FakeAuthTokenManager.ts
    InMemoryRepository.ts          → fake genérico de RepositoryPort<T>
  domain/
    entites/
      Order.test.ts
      Product.test.ts
      User.test.ts
  app/
    orders/
      CreateOrder.test.ts
      CancelOrder.test.ts
      GetOrderById.test.ts
      ListOrdersByUser.test.ts
    products/
      ...
    users/
      ...
  infra/
    validators/
      ProductValidator.test.ts
      UserValidator.test.ts
      OrderValidator.test.ts
    controller/
      ...
    shared/
      HttpErrorMapper.test.ts
  integration/                     → reservado; só entra quando Docker existir (Fase 7 da Planta)
```

---

## 3. Padrões (o que cada peça é, e o que ela pode/não pode fazer)

### 3.1 Port (contrato)

Todo recurso externo (banco, cache, e-mail, servidor HTTP, hash de senha, token, builder de validação) tem um contrato representado por uma **`abstract class`** — nunca uma `interface` do TypeScript.

**Por quê:** o `DependencyInjection` (§3.3) usa a própria classe como chave de um `Map`. Uma `interface` do TS não existe em tempo de execução, então não pode ser usada como token de injeção. `abstract class` existe em runtime, por isso é a única opção válida para um contrato injetável.

Exemplos: `ServerPort`, `CachePort`, `DataAccessPort`, `EmailPort`, `PasswordHasher`, `AuthTokenManager`, `DTOBuilderAndValidator`, `RepositoryPort<T>`.

Regra: um Port só declara métodos `abstract`, nunca implementação.

**Bônus que essa regra já pagava e agora cobra de verdade:** todo Port é o ponto natural de dublê de teste (§11.4). Nenhum teste unitário do projeto mocka lib externa — mocka-se sempre na fronteira do Port.

### 3.2 Adapter (implementação concreta de um Port)

Nome = tecnologia + o que ela é: `ServerExpressAdapter`, `RedisCacheAdapter`, `PostgresDataAccess`, `SmtpEmailServiceAdapter`, `JsonwebtokenAuthTokenManager`, `Argon2idHasher`, `ZodDTOBuilderAndValidator`.

Regra: sempre `extends` o Port correspondente. Um adapter por arquivo. O adapter é o único lugar que pode importar a lib externa (`postgres`, `redis`, `jsonwebtoken`, `argon2`, `nodemailer`, `express`).

### 3.3 DI Container (`infra/pattern/DI.ts`)

Um único `Map` (Port → instância). Métodos: `addDependency(instancia, Port)` e `getDependency<Port>(Port)`.

Regra: só entram no container os Ports **compartilhados entre features** — os que são registrados uma vez em `AppModule` (`ServerPort`, `DataAccessPort`, `CachePort`, `PasswordHasher`, `AuthTokenManager`, `EmailPort`, `DTOBuilderAndValidator`).

Repository, UseCase, Controller, Router e Validator de uma feature **não entram no container** — eles são `new`ados diretamente dentro do `Module` da própria feature.

### 3.4 Module (composition root de feature)

Uma classe `XModule` por feature, em `infra/module/`. Recebe `DependencyInjection` (e serviços compartilhados como `ServiceAuthToken`, se a feature precisar) no construtor.

Dentro do construtor, nessa ordem: pega dependências do DI → `new` Repository → `new` cada UseCase → `new` Controller → `new` Router.

Regra: um Module **não** contém lógica de negócio, não tem `if`/`for` de regra, só instancia e conecta. É registrado dentro de `AppModule.modules()`.

### 3.5 Repository

`domain/repository/RepositoryPort<T>` define o contrato genérico: `save`, `findById`, `findAll`, `update`, `findBy`, `findMany`, `exists`, `delete`.

`infra/repository/XRepository extends RepositoryPort<X>` recebe `DataAccessPort` no construtor — **nunca** importa driver de banco diretamente.

Regra:
- Guarda o nome da tabela em `private readonly collectionName`.
- Tem um método privado `mapToEntity(data: any): X` — é o único lugar que sabe o formato da linha crua do banco.
- Repository só traduz dado. Regra de negócio não vive aqui.

### 3.6 Entity (`domain/entites/`)

Classe com estado **e** comportamento, não é um DTO anêmico.

Regra:
- Construtor recebe todos os campos; campos que não mudam de dono usam `readonly`.
- Quando existe regra de criação (validação, valor default), usa fábrica estática: `static build(createId, ...): X`.
- Mutação sempre por método nomeado pela intenção de negócio: `softDelete()`, `markAsUpdated()`, `verify()`, `promoteToAdmin()`, `addItem()`. Nunca setter solto tipo `setStatus()`.
- Regra que só depende dos próprios dados da entidade vive na entidade. Regra que depende de outra entidade ou de um repositório vive no UseCase.
- Quando uma regra da entidade é violada (transição de status inválida, valor impossível), a entidade lança o erro específico da taxonomia (§10) — nunca `Error` genérico e nunca retorna `null`/`false` silencioso para esconder violação.
- Todo método de mutação que representa remoção lógica (`softDelete()`) precisa recusar dupla exclusão (`if (this.deleted_at) throw ConflictError`), de forma consistente entre todas as entidades do projeto.

### 3.7 UseCase (`app/<feature>/useCase/`)

Uma classe por ação de negócio, um arquivo por classe. Nome = verbo + substantivo: `CreateOrder`, `CancelOrder`, `GetOrderById`, `ListOrdersByUser`.

Regra:
- Único método público: `execute(...)`.
- Construtor recebe apenas Ports/Repository/funções (`RepositoryPort<T>`, `PasswordHasher`, `CreateId`, etc.) — nunca recebe o `DependencyInjection` diretamente.
- Quando uma regra de negócio é violada, lança a subclasse de `AppError` correta (§10.2), com mensagem em português. `throw new Error("...")` genérico não é aceito em código novo.
- Retorna DTO de Output. Não devolve a Entity crua para fora do UseCase.
- Todo caminho de falha do UseCase (cada `throw`) é um comportamento de negócio — e portanto exige teste (§11.5).
- Todo UseCase que opera sobre um recurso pertencente a um usuário (pedido, endereço, etc.) recebe o `userId` autenticado como parâmetro obrigatório e verifica internamente que o recurso pertence a esse usuário antes de retornar/mutar — recurso de outro usuário responde `NotFoundError`, nunca `ForbiddenError` (não revelar que o recurso existe). Usar o padrão reutilizável de ownership check já estabelecido no domínio, não reimplementar essa checagem manualmente em cada UseCase.

### 3.8 DTO (`app/<feature>/dto/`)

`interface` simples, sem métodos, sem prefixo `I`. Sufixo sempre `Input`, `Output` ou `<Algo>Output` (`OrderSummaryOutput`).

Input = o que entra no UseCase. Output = o que o UseCase devolve. Controller e Router nunca reaproveitam a Entity como retorno — sempre um DTO de Output. Nenhuma rota do projeto pode devolver entidade crua (campos internos como `deleted_at`, timestamps de banco, senha/documento sensível nunca saem em Output).

### 3.9 Controller (`infra/controller/`)

Orquestra um ou mais UseCases.

**Controller não define rota.** Regras:
- Nunca importa `IRequest`, `IResponse`, `ServerPort` ou qualquer tipo do Express.
- Nunca define path, método HTTP, status code, cookie ou header.
- Um método público por ação que o Router vai chamar, nomeado igual/próximo ao verbo do UseCase (`create`, `update`, `delete`, `getById`, `getAll`, `login`, `verifyEmail`).
- Pode combinar mais de um UseCase quando a ação de fato depende disso (ex.: `UserCrudController.create` chama `CreateUser`, gera token de verificação e dispara e-mail).
- Retorna DTO de Output puro ou deixa o erro subir (`AppError`/`ValidationError`). Quem decide o HTTP status é sempre o Router.
- Controller nunca engole erro (`try/catch` vazio ou que só loga) e nunca converte erro específico em `Error` genérico — o tipo do erro é informação que o Router precisa para escolher o status.

### 3.10 Router (`infra/routers/`)

Dono exclusivo de path, método HTTP, middleware de validação, cookie e status code.

Regras:
- Construtor recebe `ServerPort` + Controller (+ Validator/`ServiceAuthToken` quando a rota precisar), e chama `this.boot()` no fim do construtor.
- Cada handler é uma arrow function de classe tipada `middleWare`: `private createProduct: middleWare = async (req, res) => {...}` — nome do handler = verbo da ação.
- Todo handler tem `try/catch` e define o status HTTP explicitamente.
- Dentro do `catch`, o handler nunca decide status "no olho" com `if (error.message === ...)`. Ele delega para o `HttpErrorMapper` (§10.4), que traduz o tipo do erro em status + corpo padronizado.
- Validação de entrada é sempre um middleware separado (`validatorXInput`) que roda antes do handler e injeta o resultado no `req` (via cast para `IRequest<..., XInjection>`).
- Router nunca chama Repository ou UseCase diretamente — só o Controller.
- Toda rota que exige sessão/admin precisa ter o middleware correspondente aplicado individualmente no handler real (nunca assumir que "porque outra rota do mesmo arquivo tem, esta também tem") — checar cada handler ao auditar.
- Toda rota que lê/escreve banco de dados ou chama API externa passa pelo rate limiter apropriado (ver §14) — exceto leitura pública já coberta por cache-aside.
- Container do banner/elemento visual com forma decorativa (onda, elemento posicionado) sempre com `overflow:hidden` no elemento que define a largura real, para que nada vaze visualmente em nenhuma largura de tela — regra de CSS aprendida à custa de vários bugs.

### 3.11 Validator (`infra/validators/`)

Um `XValidator` por feature. Usa `DTOBuilderAndValidator.defineSchema(...)` (lista de `FieldDefinition`) e depois `validateAndTransform(data)`.

Regras:
- Métodos: `validate` (criação), `validateUpdate` (parcial), e um método extra nomeado pela ação quando necessário (`validateLogin`).
- Sempre implementa `formatError(error)`, que transforma um `ValidationError` em `Record<string, string[]>`.
- Validator nunca decide status HTTP — só valida e formata o erro. Quem usa o resultado pra responder é o Router.
- Todo campo novo do DTO de entrada tem limite de tamanho máximo explícito (não só tipo/formato) — string sem `maxLength`, array sem `maxItems`, é uma lacuna de segurança, não um detalhe.
- Toda mensagem de erro de validação chega ao cliente em português — nunca a mensagem padrão da lib de validação (ex.: mensagens em inglês do Zod) vazando sem tradução.

### 3.12 Config (`infra/config/`)

Uma classe estática `ConfigX` por assunto, com método estático `getX()`. Sempre lê a variável via `ConfigEnv.getVariable("NOME_DA_VAR")` — nunca `process.env` direto fora de `ConfigEnv`.

`ConfigEnv.getVariable` lança erro se a variável não existir. Nunca usar fallback silencioso (`?? "valor"`) para configuração obrigatória/segredo. Configuração que decide comportamento sensível (ex.: se uma rota de desenvolvimento existe) sempre falha fechado — ausência de variável nunca abre uma porta, só fecha.

---

## 4. Nomenclatura

| Elemento | Regra | Exemplo |
|---|---|---|
| Classe | PascalCase, sem underline | `CreateOrder`, `ProductRepository` |
| Interface de contrato injetável (Port) | `abstract class`, PascalCase, **nunca** `interface` | `CachePort`, `PasswordHasher` |
| Interface de formato de dado (não injetável) | prefixo `I` + PascalCase | `IRequest`, `IResponse`, `ITokenSecrets`, `ICacheSecret` |
| DTO (Input/Output) | `interface` pura, sem prefixo `I`, sufixo `Input`/`Output` | `UserInput`, `OrderOutput` |
| Erro de negócio | PascalCase, sufixo `Error`, `extends AppError` | `NotFoundError`, `ConflictError` |
| Dublê de teste | prefixo `Fake` (ou `InMemory` para repositório genérico) + nome do Port | `FakeEmailPort`, `InMemoryRepository` |
| Arquivo de teste | nome da classe testada + `.test.ts`, no espelho de `tests/` | `CreateOrder.test.ts` |
| Variável, propriedade, parâmetro, método | camelCase, sem underline | `productRepository`, `createId` |
| Exceção travada: colunas espelhando o banco | snake_case de propósito, porque a Entity mapeia 1:1 pra coluna do Postgres | `created_at`, `updated_at`, `deleted_at` |
| Arquivo | mesmo nome da classe/exportação principal | `OrderRepository.ts` → `class OrderRepository` |
| Arquivo de função utilitária solta | camelCase | `createId.ts` → `createIdAdapter` |
| Pasta | lowercase; ao adicionar em uma camada já existente, usar o nome de pasta **já usado** — nunca criar sinônimo (não criar `repositories` se já existe `repository`) | `controller`, `module`, `repository`, `routers`, `validators` |
| Variável de ambiente | SCREAMING_SNAKE_CASE, prefixo do serviço quando houver múltiplas | `MP_ACCESS_TOKEN`, `MELHOR_ENVIO_CLIENT_ID`, `SIRV_CLIENT_ID` |

---

## 5. Regra maior: SEM COMENTÁRIOS

Nenhum comentário no código, nunca — nem explicando o que o código faz, nem código morto comentado (`// const x = ...`), nem "porquê não óbvio" de comportamento de API externa (isso vai para o §13, não para o código-fonte — já houve tentativa de abrir essa exceção neste projeto, e foi negada).

O nome da classe, do método e da variável tem que ser autoexplicativo. Se o nome não é suficiente para entender o código, **o nome está errado** — renomear, não comentar.

**A regra vale igualmente para os testes.** A "documentação" de um teste é o texto do `describe`/`it` (§11.6), não comentário.

---

## 6. Tamanho de classe

- Uma classe pública por arquivo.
- Limite de **120 linhas por classe**. Se passar disso, é sinal de que a classe está fazendo mais de uma coisa — dividir por responsabilidade (ex.: separar um novo UseCase, não inchar o Controller; separar um Adapter grande em fatias de responsabilidade, ex.: `XOAuthAdapter` + `XShippingAdapter`, se um único Adapter de integração externa crescer demais).
- Método com mais de ~25 linhas é sinal de quebrar em método privado menor, dentro da mesma classe.
- Exceção documentada: `ZodDTOBuilderAndValidator` (builder de schema) pode ultrapassar o limite porque é um `switch` de mapeamento repetitivo por tipo de campo, não lógica de negócio. Não usar essa exceção para justificar Controller, Router, Repository ou UseCase grandes.
- Arquivos de teste **não** têm limite de 120 linhas — pela regra de proporção do §12, eles serão naturalmente maiores que a classe testada. O limite deles é outro: um arquivo de teste cobre **uma** classe, e cada `it` prova **um** comportamento.

---

## 7. Direção de dependência (quem pode importar quem)

```
domain/   → não importa nada de app/ nem de infra/
app/      → só importa de domain/
infra/    → pode importar de domain/ e de app/
main.ts   → só importa AppModule
tests/    → pode importar de qualquer camada de src/ (é o único lugar com esse privilégio)
```

Os erros de `domain/errors/` são importáveis por todas as camadas (domain, app, infra) — é por isso que moram em `domain/`, e não em `infra/`. `ValidationError` continua em `infra/shared/errors/` porque nasce da fronteira de validação de DTO, que é assunto de infra.

Fluxo de uma requisição:

```
Router → Rate limiter → Validator (middleware) → Controller → UseCase → RepositoryPort → DataAccessPort → Adapter concreto
```

Fluxo de um erro (caminho de volta):

```
Entity/UseCase lança AppError específico → Controller deixa subir → Router captura → HttpErrorMapper traduz em status + corpo → resposta HTTP
```

---

## 8. Passo a passo obrigatório para criar uma feature nova

1. Entity em `domain/entites/` (com `static build` se houver regra de criação) — lançando erro específico da taxonomia (§10) em toda regra violada.
2. **Teste da Entity** em `tests/domain/entites/` — caminho feliz + um `it` por regra/`throw` da entidade.
3. Se precisar de um contrato novo (não existente ainda), Port em `domain/` como `abstract class` — e o `Fake` correspondente em `tests/doubles/`.
4. DTOs (`Input`/`Output`) em `app/<feature>/dto/`.
5. UseCases em `app/<feature>/useCase/`, um por ação, só com `execute`.
6. **Teste de cada UseCase** em `tests/app/<feature>/` — caminho feliz + um `it` por `throw` + interação com os Fakes (o que foi salvo, o que foi buscado).
7. Repository em `infra/repository/`, `extends RepositoryPort<Entity>`.
8. Validator em `infra/validators/`, usando `DTOBuilderAndValidator`.
9. **Teste do Validator** em `tests/infra/validators/` — dado válido passa, cada campo inválido falha com a mensagem certa via `formatError`.
10. Controller em `infra/controller/`, orquestrando os UseCases — zero HTTP.
11. **Teste do Controller** quando ele orquestra mais de um UseCase ou tem lógica de combinação (ex.: criar usuário + token + e-mail). Controller que só repassa 1:1 para um UseCase já testado não precisa de teste próprio.
12. Router em `infra/routers/`, com `boot()` registrando as rotas via `ServerPort.addRouter`, usando `HttpErrorMapper` no `catch` e o rate limiter apropriado (§14).
13. Module em `infra/module/`, conectando tudo isso na ordem: Repository → UseCases → Controller → Router.
14. Registrar o novo Module dentro de `AppModule.modules()`.
15. Conferir a proporção do §12 antes de declarar a feature pronta.
16. **`git add . && git commit -m "..." && git push`** (§0) — a feature não está pronta sem isso, mesmo que todo o resto esteja perfeito.

Se qualquer um desses passos for pulado ou feito fora de ordem, o código não está de acordo com o padrão do projeto. Teste não é etapa opcional nem "fase de depois": entrega sem os testes dos passos 2, 6 e 9 é entrega rejeitada. Entrega sem commit/push (passo 16) é entrega rejeitada, ponto final.

---

## 9. Ordem de trabalho dentro de uma entrega

Para cada classe de produção, o pedreiro trabalha em ciclo curto:

1. Escreve a classe (ou o método).
2. Escreve os testes dela **na mesma entrega** (não em uma entrega separada "só de testes").
3. Roda a suíte inteira (`vitest run`) — não só o arquivo novo.
4. Só então passa para a próxima classe.

É proibido acumular várias classes sem teste para "testar tudo no final". O supervisor deve rejeitar qualquer entrega em que exista classe de produção nova sem o teste correspondente na mesma entrega — e deve rejeitar qualquer entrega concluída sem commit/push (§0).

---

## 10. Tratamento de erros (substitui o antigo §3.13 "Erros")

### 10.1 Princípio

Erro é parte do contrato de negócio, não acidente. Cada falha possível tem um **tipo** que diz *o que* aconteceu, uma **mensagem em português** que diz isso *para o usuário final*, e um **teste** que prova que ela acontece na hora certa. As três coisas andam juntas: `throw` novo sem teste novo é violação de padrão.

### 10.2 Taxonomia (`domain/errors/`)

- `AppError` — `abstract class`, `extends Error`. Base de todo erro de negócio. Nunca é lançada diretamente.
- `NotFoundError` — o recurso pedido não existe (produto, pedido, usuário) — ou existe mas pertence a outro usuário (ownership check, §3.7).
- `ConflictError` — o estado atual impede a operação por duplicidade/concorrência (e-mail já cadastrado, pedido já cancelado, estoque já reservado, remoção dupla).
- `UnauthorizedError` — identidade ausente ou inválida (sem token, token expirado/revogado/malformado, senha errada).
- `ForbiddenError` — identidade válida, mas sem permissão para esta ação (usuário comum tentando ação de admin).
- `BusinessRuleError` — regra de negócio violada que não se encaixa nas anteriores (estoque insuficiente, status não permite transição, valor inválido pós-validação).
- Novos tipos específicos podem nascer quando um caso real não se encaixa nos anteriores (ex.: `IntegrationNotConnectedError` para integração externa não autorizada) — sempre `extends AppError`, sempre com teste.

`ValidationError` (`infra/shared/errors/`) permanece como está: é o único tipo para falha de formato/schema de DTO, o único com `.details`, e **não** entra na taxonomia de `domain/` — formato é assunto da fronteira, não do domínio.

Regras:
- Escolher sempre o tipo mais específico. `BusinessRuleError` é o último recurso, não o padrão preguiçoso.
- Identificadores (classe, propriedade) em inglês; mensagem voltada ao usuário final em português.
- Mensagem nunca vaza detalhe técnico (nome de tabela, stack, SQL, segredo). O que o usuário lê é linguagem de negócio.
- Qualquer falha de verificação de token vinda da lib externa (malformado, expirado) é convertida para `UnauthorizedError` — nunca deixa o erro técnico da lib subir cru como 500.

### 10.3 Onde cada erro pode nascer

| Camada | Pode lançar | Nunca lança |
|---|---|---|
| Entity | `BusinessRuleError`, `ConflictError` (regra interna de estado) | erros de infra, `ValidationError` |
| UseCase | qualquer `AppError` da taxonomia | `Error` genérico, `ValidationError` |
| Validator | `ValidationError` | `AppError` |
| Repository / Adapter | deixa o erro técnico da lib subir como está (o Router trata como 500) | `AppError` fingindo ser negócio |
| Controller | nenhum novo — só deixa subir | qualquer coisa; Controller não engole nem re-embrulha erro |
| Router | nenhum — captura e delega ao `HttpErrorMapper` | decisão de status "no olho" |

### 10.4 `HttpErrorMapper` (`infra/shared/errors/`)

Única classe do projeto que conhece a tabela erro → HTTP. Todo `catch` de Router chama ela, nenhum Router repete a tabela.

| Tipo capturado | Status | Corpo |
|---|---|---|
| `ValidationError` | 400 | `{ error: mensagem, details: formatError(...) }` |
| `UnauthorizedError` | 401 | `{ error: mensagem }` |
| `ForbiddenError` | 403 | `{ error: mensagem }` |
| `NotFoundError` | 404 | `{ error: mensagem }` |
| `ConflictError` | 409 | `{ error: mensagem }` |
| `BusinessRuleError` | 422 | `{ error: mensagem }` |
| `IntegrationNotConnectedError` (ou similar) | 503 | `{ error: mensagem }` |
| Qualquer outro (`Error` desconhecido, erro de lib, JSON malformado do body-parser) | 500 (ou 400 no caso de JSON malformado) | `{ error: "Erro interno do servidor" }` / `{ error: "Corpo da requisição inválido." }` — a mensagem original **nunca** vai para o cliente |

Regras:
- O corpo de erro tem sempre o mesmo formato (`error` + `details` opcional) em todas as rotas do projeto.
- O `HttpErrorMapper` tem teste próprio cobrindo **todas** as linhas da tabela, incluindo a de 500.
- Todo erro que cai no branch 500 é logado no servidor (`console.error` com stack) antes de responder o corpo genérico ao cliente — nunca um 500 silencioso.
- O handler de erro global do servidor (Express) nunca deixa vazar stack trace, HTML ou path de arquivo para o cliente, mesmo em falha de parsing do corpo da requisição, antes de qualquer rota ser alcançada.

### 10.5 Migração do código existente

Regra de migração:
- Código **novo**: sempre taxonomia, sem exceção.
- Código **existente**: ao tocar em um arquivo por qualquer motivo, os `throw new Error` daquele arquivo são migrados para o tipo correto **na mesma entrega**, junto com os testes deles.
- Não abrir uma "entrega gigante de migração de erro" varrendo o projeto inteiro de uma vez — a migração acompanha o roteiro de fases da Planta, arquivo a arquivo.

---

## 11. Testes

### 11.1 O que é obrigatório testar

| Peça | Teste | Obrigatório? |
|---|---|---|
| Entity | unitário puro (sem dublê) | Sim — toda entidade |
| UseCase | unitário com Fakes nos Ports | Sim — todo UseCase |
| Validator | unitário (dado bruto → DTO ou `ValidationError`) | Sim — todo Validator, sem exceção |
| `HttpErrorMapper` e classes de `shared/` | unitário | Sim |
| Lógica de segurança (rate limit, ownership check, validação de arquivo/magic bytes) | unitário, cobrindo caminho permitido E caminho bloqueado | Sim, sem exceção de proporção — é comportamento crítico, não glue |
| Controller | unitário com UseCases reais + Fakes nos Ports | Só quando orquestra >1 UseCase ou tem lógica de combinação |
| Repository / Adapter que fala HTTP cru com API externa | integração (rede real) | Ainda não — entra junto com Docker (Fase 7); a fronteira é coberta pelos Fakes na camada de UseCase. Extrair para uma classe pura testável (ex.: `WebhookSignatureValidator`, `ImageFileValidator`) qualquer lógica que dê pra isolar sem rede — isso sim exige teste, sem exceção |
| Router / Module / Config / DTO / Port | — | Não (Router é colagem fina sobre o Controller; DTO e Port não têm comportamento) |

### 11.2 Estrutura e execução

- Testes moram em `tests/`, espelhando o caminho de `src/` (`src/app/orders/useCase/CreateOrder.ts` → `tests/app/orders/CreateOrder.test.ts`).
- Um arquivo de teste por classe testada. Nome: `X.test.ts`.
- `vitest run` no `package.json` como `npm test`. A suíte inteira precisa passar antes de qualquer entrega ser declarada pronta — teste quebrado não é "detalhe pra depois".
- Teste não depende de rede, banco real, Redis real, SMTP real, relógio real nem de ordem de execução. Cada `it` monta seu próprio cenário do zero.

### 11.3 Anatomia de um teste

- Estrutura interna sempre em três blocos, na ordem: **preparar** (montar entidade/fakes/entrada), **agir** (uma chamada ao método testado), **verificar** (asserts).
- Um `it` prova **um** comportamento. Se o `it` precisa de dois cenários diferentes para fazer sentido, são dois `it`.
- `describe` de fora = nome da classe; `describe` interno (opcional) = método; texto do `it` = frase em português descrevendo o comportamento, no mesmo tom das mensagens de erro: `it("recusa cancelamento de pedido já enviado")`, `it("cria o pedido com status aguardando pagamento")`.
- Assert de erro sempre verifica **o tipo e a mensagem**: esperar que lance `ConflictError` *e* que a mensagem seja a mensagem em português definida no código. Só verificar "lançou alguma coisa" não prova nada.
- Assert de dado sensível: sempre há pelo menos um teste provando que um campo interno (`deleted_at`, senha, documento) **não** aparece no Output.

### 11.4 Dublês de teste (`tests/doubles/`)

- Todo dublê é uma classe escrita à mão que `extends` o Port correspondente — exatamente como um Adapter, só que em memória. Prefixo `Fake` (`FakeEmailPort`, `FakeCachePort`) ou `InMemory` para o repositório genérico (`InMemoryRepository<T> extends RepositoryPort<T>`).
- Dublê guarda o que recebeu (`sentEmails`, `savedItems`) para o teste poder verificar interação — não só retorno.
- Dublê pode ser configurado para falhar (`failNextCall()`) para testar caminho de erro de infra.
- **Proibido:** `vi.mock` de módulo, mock de `postgres`/`redis`/`nodemailer`/Redis direto, monkey-patch de método. Se algo está difícil de dublar, é sinal de que falta um Port — a correção é no design, não no teste.
- Dublê segue as mesmas regras de código de produção (sem comentário, nomes autoexplicativos), mas não conta como "código de aplicação" na proporção do §12 — conta como código de teste.
- **Atenção especial:** `InMemoryRepository` (e qualquer outro dublê que simule filtro implícito do banco real, como `deleted_at IS NULL` em toda consulta) precisa replicar esse comportamento fielmente. Um dublê que não replica um filtro que o `PostgresDataAccess` real sempre aplica gera falsa confiança — já causou um bug real neste projeto (teste passava para um caminho inalcançável em produção).

### 11.5 Cobertura de comportamento (a régua real)

Número de cobertura de linha não é a régua. A régua é:

- Todo método público de Entity/UseCase/Validator tem pelo menos: 1 teste de caminho feliz + 1 teste por `throw` que ele contém.
- Todo `if` de regra de negócio tem os dois lados provados.
- Toda interação relevante com Port é verificada (o e-mail foi enviado? o estoque foi baixado? o token foi revogado? o cache foi invalidado?).
- Se um comportamento não tem como ser testado sem acessar rede/banco real, ele está na camada errada — mover a lógica, não pular o teste.
- Toda operação concorrente/com race condition potencial (ex.: rate limiter) precisa de teste com concorrência real (`Promise.all`), não só sequencial — um teste sequencial não prova nada sobre atomicidade.

### 11.6 Idioma nos testes

Mesma regra do resto do projeto: identificadores (variáveis, funções auxiliares, classes Fake) em inglês; textos de `describe`/`it` e mensagens verificadas em português. O relatório do Vitest deve ler como uma especificação de negócio em português.

---

## 12. Regra de proporção: 2–3× mais teste + erro do que código de aplicação

Esta é a régua de aceite quantitativa de **toda entrega**:

- **Métrica:** linhas de código novas/alteradas em `tests/` + linhas de tratamento de erro (classes de `errors/`, `HttpErrorMapper`, blocos `try/catch` e `throw` com seus testes) **dividido por** linhas de código de aplicação novas/alteradas em `src/` (excluindo as próprias classes de erro, DTOs sem comportamento, e Router/Module de colagem pura).
- **Mínimo para aceitar a entrega: 2,0×.** **Alvo: 2,5–3,0×.**
- Verificação simples, sem ferramenta especial: `wc -l` nos arquivos tocados pela entrega, comparando os dois lados. O supervisor faz essa conta em toda revisão e escreve o número no aceite — **sempre numa tabela por fatia, nunca um número agregado único**, porque o agregado esconde exatamente o ponto fraco que a régua existe para achar.
- A proporção se atinge **cobrindo comportamento de verdade** (§11.5): mais cenários de falha, mais transições de estado provadas, mais interações verificadas. É proibido inflar o número com teste duplicado, assert redundante, cenário copiado com outro nome ou linha em branco decorativa — o supervisor deve rejeitar inflação tão firmemente quanto rejeita falta de teste.
- Entregas raras que são só colagem (um Module novo, registro no AppModule, Repository/Adapter que fala com API externa sem lógica extraível) podem ficar abaixo de 2,0× — nesse caso o supervisor registra a exceção e o motivo no aceite. Exceção é por fatia específica, nunca por fase/entrega inteira.

---

## 13. Débitos conhecidos (não usar como referência de padrão)

- `infra/validators/Validator.ts` é um `abstract class` genérico que nenhum validator concreto implementa hoje. Não estender essa classe em validators novos até ela ser adotada de fato.
- `infra/schema/ProductSchema.ts` é um schema Zod solto, não conectado ao fluxo real de validação. Não usar como exemplo de validação.
- `infra/security/IAuthTokenManager.ts` é uma `interface` paralela ao `AuthTokenManager` (abstract class); hoje só o tipo `TokenGenerationOptions` dela é usado de fato. Não criar um contrato de Port como `interface` — seguir §3.1.
- Nomes de arquivo com typo mantidos de propósito para não quebrar imports existentes: pasta `entites` (não `entities`), `infra/database/DataAcess.ts` (não `DataAccess.ts`), `infra/email/SmptEmailServiceAdapter.ts` (não `Smtp...`). Não corrigir sem pedido explícito.
- Colunas legadas do banco real às vezes existem em camelCase (ex.: um histórico de `"isAdmin"` antes da migração para `role`) — sempre conferir o schema real via `information_schema`/painel do Supabase antes de assumir snake_case, e usar aspas duplas no SQL quando necessário.
- `MercadoPagoOrderStatusMapper` mapeia o status `expired` da API para `CANCELLED`, não para `EXPIRED` (que existe no domínio mas não é usado nesse mapeamento). Corrigir quando o fluxo de pagamento for revisitado.
- `MelhorEnvioCarrierRules` identifica transportadoras não-compráveis via API (Azul Cargo sempre; Jadlog em sandbox) por checagem textual do nome, não por campo explícito da API (que não existe) — quebra silenciosamente se a transportadora for renomeada.
- `tests/doubles/InMemoryRepository.ts`: `findBy`/`findMany` já replicam o filtro implícito `deleted_at IS NULL` (corrigido junto da introdução de `findByIncludingDeleted`, usado pelo fluxo de reativação de conta). `findAll`, `findManyByIds` e `exists` **ainda não** replicam esse filtro — ver §11.4 para o risco associado. Ao tocar em qualquer fluxo de soft delete que passe por esses três métodos, verificar manualmente contra o banco real antes de confiar no teste unitário isolado.
- Decisão revertida (users_email_unique, migração 0015): e-mail agora é `UNIQUE` em qualquer estado (ativo ou soft-deletado) — uma conta soft-deletada que volta a logar via Google é **reativada** (`AuthenticateWithGoogle` + `User.reactivate()`), nunca duplicada numa linha nova. O motivo anterior (permitir reuso via linha nova) causava múltiplas identidades de `users` pra mesma pessoa, com pedidos/endereços espalhados entre elas. Username continua com o comportamento antigo: `users_username_unique_active` é parcial (só entre linhas ativas), então username de conta soft-deletada ainda pode ser reaproveitado por um cadastro novo — isso não mudou.
- `RedisRateLimiterAdapter` executa um script Lua (`EVAL`) traduzido à mão a partir de `RateLimitPolicy.ts` (a spec testada em TypeScript) — os dois precisam ficar em sincronia manualmente; nada na suíte automatizada detecta divergência entre eles. Depois de qualquer mudança de regra num dos dois lados, reverificar manualmente com um script de concorrência real (`Promise.all`) contra o Redis real do projeto.
- Conhecimento operacional de integrações externas (comportamento real de sandbox do Mercado Pago, Melhor Envio, Sirv — incluindo particularidades como Pix sem sandbox na API legada, conta/app separados por ambiente no Melhor Envio, formato de resposta do upload do Sirv) fica documentado nos relatórios de entrega de cada integração, não repetido aqui.
- `CheckoutOrder` grava `freight` sempre como `0` (`PLACEHOLDER_FREIGHT_CENTS`, Fase 0) porque o cálculo real de frete (Melhor Envio) ainda não existe — o campo precisava parar de estar ausente do `INSERT` (violava `NOT NULL` sem default em `pedidos.freight`), mas o valor em si ainda não reflete custo de frete real. Substituir por cálculo real na fase do Melhor Envio, junto com `Order.attachShipping()` (já existe no domínio, ainda não é chamado por nenhum UseCase).
- Não existe rota `GET /auth/me` (ou equivalente) no código reconstruído — confirmado por log de boot, só 21 rotas registradas. Vai ser necessária quando o storefront React for reconstruído, para o frontend descobrir se o usuário está logado sem precisar tentar uma rota protegida e capturar 401 como efeito colateral. Não implementar antes do storefront existir.

---

## 14. Segurança — zero trust (rate limiting, autorização, payload)

Princípio: rate limit e outras defesas protegem o que tem custo real (escrita em banco relacional, chamada a API paga externa) ou risco de segurança — nunca leitura pública já servida por cache-aside, e nunca um padrão de uso já esperado do próprio app (como polling de status).

- Toda rota do projeto tem uma tier de rate limit explícita, numa tabela única e testável (não espalhada por Router individual), com a chave no Redis sempre incluindo o identificador da rota — nunca só o identificador do cliente, para que tiers diferentes nunca disputem o mesmo limite.
- Leitura pública cacheada (cache-aside de verdade, não "confio que está tudo bem"): isenta de rate limit.
- Leitura autenticada não cacheada: limite moderado, sem travar navegação normal nem polling esperado do próprio app.
- Escrita em banco relacional: limite genérico.
- Chamada a API paga externa: limite mais apertado, com bloqueio mais longo.
- Webhook de terceiro confiável (ex.: Mercado Pago) com assinatura criptográfica validada antes de qualquer processamento: decisão sobre rate limit por IP é explícita, não por omissão — geralmente isento, já que a assinatura é a proteção real e um rate limit ali arriscaria descartar notificação legítima.
- Toda rota que opera sobre recurso de usuário faz ownership check (§3.7) — token prova identidade, nunca prova autorização sobre um recurso específico; isso é sempre checagem separada.
- Toda rota de upload de arquivo valida por assinatura binária real (magic bytes), nunca confia em `Content-Type` declarado pelo cliente, e tem rate limit próprio mais apertado que o genérico.
- Nenhum segredo (chave de API, senha, `client_secret`) pode depender de estar "escondido" no frontend — o frontend nunca guarda segredo algum; toda integração com terceiro passa pelo backend. Ofuscação de build (minificação, remoção de sourcemap) é aceitável como dificultar leitura casual, nunca como fonte de segurança real.