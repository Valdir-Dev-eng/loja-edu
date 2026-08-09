import postgres from 'postgres';
import { DataAccessPort } from '../../domain/database/DataAcess';
import { ConflictError } from '../../domain/errors/ConflictError';
import { ConfigDb } from '../config/ConfigDb';
import { withTimeout } from '../shared/withTimeout';

const POOL_MAX_CONNECTIONS = 10;
// Codigo de erro real do protocolo Postgres pra unique_violation — igual em
// qualquer tabela/constraint, nao e' string de mensagem (essa nunca muda por
// idioma/versao). https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION_CODE = '23505';
// `constraint_name` e' campo estruturado do protocolo Postgres (igual
// `code`), nao mensagem — nao muda com idioma/versao do servidor. Mapeia pro
// texto de negocio quando a gente sabe qual constraint e' qual; qualquer
// constraint fora desse mapa cai no generico abaixo, nunca quebra.
const UNIQUE_VIOLATION_MESSAGES: Record<string, string> = {
  users_document_unique_idx: 'Este CPF/CNPJ já está cadastrado em outra conta.',
  users_email_unique: 'Este e-mail já está cadastrado.',
};
const GENERIC_UNIQUE_VIOLATION_MESSAGE = 'Já existe um registro com esses dados.';

export class PostgresDataAccess extends DataAccessPort {
  private readonly sql: postgres.Sql;
  private readonly queryTimeoutMs: number;
  private readonly allowedFields = ['id', 'name', 'ean', 'price', 'stock', 'discount', 'deleted_at'];

  // `existingSql` so e usado internamente por transaction() pra construir uma
  // instancia amarrada a conexao da transacao em vez de abrir um pool novo —
  // nao chamar com esse parametro fora daqui.
  constructor(existingSql?: postgres.Sql) {
    super();
    this.queryTimeoutMs = ConfigDb.getQueryTimeoutMs();
    // TENTATIVA DE statement_timeout VIA PARAMETRO DE STARTUP FALHOU: o
    // acesso deste projeto ao Postgres passa pelo Supavisor em modo
    // transaction pooling (porta 6543, DIRECT_URL) — esse pooler rejeita
    // "statement_timeout" como parametro de startup ("unsupported startup
    // parameter"), confirmado rodando contra o banco real. A forma correta
    // de configurar isso aqui e' `ALTER ROLE <role> SET statement_timeout =
    // <ConfigDb.getStatementTimeoutMs()>` uma vez no banco — fica gravado no
    // catalogo (pg_db_role_setting) e se aplica sozinho toda vez que a role
    // autentica, independente de pooler, sem precisar de negociacao de
    // startup por conexao. Isso e' uma mudanca de banco, nao de codigo — nao
    // rodei, fica registrado como pendente (ver relatorio da fatia).
    // Ate isso ser feito, so o timeout do lado do CLIENTE abaixo protege —
    // e ele nao libera a conexao, so faz quem chamou desistir de esperar.
    this.sql = existingSql ?? postgres(ConfigDb.getDb(), {
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10,
      max: POOL_MAX_CONNECTIONS,
    });
  }

  async findBy<T extends object>(query: Partial<T>): Promise<T | null> {
    const result = await this.findOne<T>('users', query);
    return result || null;
}


  private readonly retryableConnectionErrorCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'CONNECT_TIMEOUT'];
  private readonly maxConnectionAttempts = 3;

  // IMPORTANTE — o que isso resolve e o que NAO resolve:
  // withTimeout aqui faz QUEM CHAMOU desistir de esperar apos queryTimeoutMs
  // — evita uma requisicao HTTP travar pra sempre. Isso NAO cancela a query
  // nem libera a conexao do pool: ela continua rodando (ou presa esperando
  // rede) ate terminar por conta propria. Quem efetivamente mataria a query
  // e liberaria a conexao seria o `statement_timeout` do SERVIDOR — mas essa
  // protecao NAO esta ativa hoje (ver comentario no construtor: o pooler de
  // transacao do Supabase rejeita configurar isso por conexao). Ate isso ser
  // resolvido (via ALTER ROLE, pendente), varias queries fugitivas
  // simultaneas ainda esgotam o pool de 10 conexoes mesmo com este timeout
  // do cliente ativo — ele so protege quem esta esperando, nao o pool.
  private async executeQuery<T>(callback: (sql: postgres.Sql) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.maxConnectionAttempts; attempt++) {
      try {
        return await withTimeout(callback(this.sql), this.queryTimeoutMs, 'postgres query');
      } catch (error) {
        if (!this.isRetryableConnectionError(error) || attempt === this.maxConnectionAttempts) {
          throw this.translateKnownPostgresError(error);
        }
        await this.wait(attempt * 300);
      }
    }
    throw new Error('Falha ao conectar ao banco de dados após múltiplas tentativas.');
  }

  private isRetryableConnectionError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    return typeof code === 'string' && this.retryableConnectionErrorCodes.includes(code);
  }

  // Traduz erros do DRIVER (identificados por codigo/campo real do
  // protocolo, nunca por mensagem) pra erros de dominio que o
  // HttpErrorMapper sabe responder E que o frontend consegue mostrar direto
  // pro usuario. Ponto unico — todo INSERT/UPDATE passa por executeQuery,
  // entao qualquer violacao de unique constraint em qualquer tabela cai
  // aqui, sem precisar de tratamento por chamador. Isso e' a rede de
  // seguranca pra quando duas escritas concorrentes furam a checagem
  // otimista da use case (quando ela existe) e o indice unico do banco e'
  // quem realmente decide — por isso usa a MESMA mensagem que a checagem
  // otimista já usa (ex.: CompleteOnboarding.ts), pra ficar consistente
  // independente de qual caminho pegou o conflito.
  private translateKnownPostgresError(error: unknown): unknown {
    const pgError = error as { code?: string; constraint_name?: string };
    if (pgError?.code === UNIQUE_VIOLATION_CODE) {
      const message = UNIQUE_VIOLATION_MESSAGES[pgError.constraint_name ?? ''] ?? GENERIC_UNIQUE_VIOLATION_MESSAGE;
      return new ConflictError(message);
    }
    return error;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

private buildWhere(sql: postgres.Sql, query: Record<string, any>) {
  const keys = Object.keys(query);

  if (keys.length === 0) return sql`deleted_at IS NULL`;

  const conditions = keys.map(key => sql`${sql(key)} = ${query[key]}`);
  conditions.push(sql`deleted_at IS NULL`);

  return conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);
}

// Mesma montagem de WHERE, mas sem o `deleted_at IS NULL` implicito — uso
// restrito a fluxos que precisam enxergar linha soft-deletada de proposito
// (ex.: reativar conta em vez de duplicar), nunca pra leitura/listagem comum.
private buildWhereIncludingDeleted(sql: postgres.Sql, query: Record<string, any>) {
  const keys = Object.keys(query);

  if (keys.length === 0) return sql`TRUE`;

  const conditions = keys.map(key => sql`${sql(key)} = ${query[key]}`);
  return conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);
}


  async count<T extends object>(collectionName: string, query: Partial<T>): Promise<number> {
    return this.executeQuery(async (sql) => {
      const [{ count }] = await sql`
        SELECT count(*)::int FROM ${sql(collectionName)} 
        WHERE ${this.buildWhere(sql, query as any)}
      `;
      return count;
    });
  }

  async findMany<T extends object>(collectionName: string, query?: Partial<T>, selectFields?: (keyof T)[]): Promise<T[]> {
    return this.executeQuery(async (sql) => {
      const fields = selectFields && selectFields.length > 0 
        ? selectFields.map(f => sql(f as string)) 
        : sql`*`;
      return await sql<T[]>`
        SELECT ${fields} FROM ${sql(collectionName)} 
        WHERE ${query ? this.buildWhere(sql, query as any) : sql`deleted_at IS NULL`}
      `;
    });
  }

  async findManyByField<T extends object>(
    collectionName: string,
    field: string,
    values: readonly (string | number)[]
  ): Promise<T[]> {
    if (values.length === 0) {
      return [];
    }
    return this.executeQuery(async (sql) => {
      return await sql<T[]>`
        SELECT * FROM ${sql(collectionName)}
        WHERE ${sql(field)} IN ${sql(values as (string | number)[])} AND deleted_at IS NULL
      `;
    });
  }

  async findOne<T extends object>(collectionName: string, query: Partial<T>): Promise<T | undefined> {
    return this.executeQuery(async (sql) => {
      const [row] = await sql<T[]>`
        SELECT * FROM ${sql(collectionName)} 
        WHERE ${this.buildWhere(sql, query as any)} 
        LIMIT 1
      `;
      return row;
    });
  }

  async findOneIncludingDeleted<T extends object>(collectionName: string, query: Partial<T>): Promise<T | undefined> {
    return this.executeQuery(async (sql) => {
      const [row] = await sql<T[]>`
        SELECT * FROM ${sql(collectionName)}
        WHERE ${this.buildWhereIncludingDeleted(sql, query as any)}
        LIMIT 1
      `;
      return row;
    });
  }

  async create<T extends object>(collectionName: string, data: Partial<T>): Promise<string | number | undefined> {
    return this.executeQuery(async (sql) => {
      const [result] = await sql`
        INSERT INTO ${sql(collectionName)} ${sql(data as Record<string, any>)}
        RETURNING id
      `;
      return result?.id;
    });
  }

  async update<T extends object>(collectionName: string, query: Partial<T>, data: Partial<T>): Promise<number> {
    return this.executeQuery(async (sql) => {
      const result = await sql`
        UPDATE ${sql(collectionName)} 
        SET ${sql(data as Record<string, any>)} 
        WHERE ${this.buildWhere(sql, query as any)}
      `;
      return result.count;
    });
  }

  async remove(collectionName: string, query: Partial<any>): Promise<number> {
    return this.executeQuery(async (sql) => {
      const result = await sql`
        UPDATE ${sql(collectionName)}
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE ${this.buildWhere(sql, query)}
      `;
      return result.count;
    });
  }

  async decrementIfSufficient(collectionName: string, id: string, field: string, amount: number): Promise<boolean> {
    return this.executeQuery(async (sql) => {
      const result = await sql`
        UPDATE ${sql(collectionName)}
        SET ${sql(field)} = ${sql(field)} - ${amount}
        WHERE id = ${id} AND ${sql(field)} >= ${amount} AND deleted_at IS NULL
      `;
      return result.count > 0;
    });
  }

  async updateIfEqual<T extends object>(
    collectionName: string,
    id: string,
    field: string,
    expectedValue: unknown,
    data: Partial<T>
  ): Promise<boolean> {
    return this.executeQuery(async (sql) => {
      const result = await sql`
        UPDATE ${sql(collectionName)}
        SET ${sql(data as Record<string, any>)}
        WHERE id = ${id} AND ${sql(field)} = ${expectedValue as any} AND deleted_at IS NULL
      `;
      return result.count > 0;
    });
  }

  async incrementField(collectionName: string, id: string, field: string, amount: number): Promise<void> {
    await this.executeQuery(async (sql) => {
      await sql`
        UPDATE ${sql(collectionName)}
        SET ${sql(field)} = ${sql(field)} + ${amount}
        WHERE id = ${id} AND deleted_at IS NULL
      `;
    });
  }

  async transaction<T>(callback: (tx: DataAccessPort) => Promise<T>): Promise<T> {
    // sql.begin() tipa o retorno como UnwrapPromiseArray<T> (desembrulha caso
    // T seja um array de promises) — nao se aplica aqui, T nunca e' array
    // nesse uso; o cast so alinha o tipo, nao muda o valor em runtime.
    return this.sql.begin(async (txSql) => {
      // TransactionSql e Sql sao interfaces irmas (as duas estendem ISql) —
      // nominalmente diferentes no TS, mas identicas em tudo que essa classe
      // usa (tagged template + sql() como helper de identificador).
      const txDataAccess = new PostgresDataAccess(txSql as unknown as postgres.Sql);
      return callback(txDataAccess);
    }) as Promise<T>;
  }
}