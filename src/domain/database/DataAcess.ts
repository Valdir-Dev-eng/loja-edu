export abstract class DataAccessPort {
  abstract findMany<T extends object>(collectionName: string, query?: Partial<T>, selectFields?: (keyof T)[]): Promise<T[]>;
  abstract findManyByField<T extends object>(collectionName: string, field: string, values: readonly (string | number)[]): Promise<T[]>;
  abstract findOne<T extends object>(collectionName: string, query: Partial<T>, selectFields?: (keyof T)[]): Promise<T | undefined>;
  abstract findOneIncludingDeleted<T extends object>(collectionName: string, query: Partial<T>): Promise<T | undefined>;
  abstract create<T extends object>(collectionName: string, data: Partial<T>): Promise<string | number | undefined>;
  abstract update<T extends object>(collectionName: string, query: Partial<T>, data: Partial<T>): Promise<number>;
  abstract findBy<T extends object>(query: Partial<T>): Promise<T | null> ;
  abstract remove(collectionName: string, query: Partial<any>): Promise<number>;
  abstract count<T extends object>(collectionName: string, query: Partial<T>): Promise<number>;
  abstract decrementIfSufficient(collectionName: string, id: string, field: string, amount: number): Promise<boolean>;

  // CAS (compare-and-swap): so escreve `data` se o valor atual de `field` for
  // exatamente `expectedValue` — mesma UPDATE...WHERE atomica do
  // decrementIfSufficient, sem leitura-then-escrita. 0 linhas afetadas =
  // outra chamada ja resolveu (ou o registro nunca esteve no estado
  // esperado); nunca decide isso lendo o registro antes, so pelo count do
  // proprio UPDATE.
  abstract updateIfEqual<T extends object>(
    collectionName: string,
    id: string,
    field: string,
    expectedValue: unknown,
    data: Partial<T>
  ): Promise<boolean>;

  // Incremento atomico simetrico ao decrementIfSufficient — sem guarda de
  // suficiencia porque incrementar nunca fica negativo.
  abstract incrementField(collectionName: string, id: string, field: string, amount: number): Promise<void>;

  // Roda `callback` dentro de uma unica transacao real do Postgres — tudo
  // que `callback` fizer via o DataAccessPort recebido (tx) commita junto ou
  // sofre rollback junto. Nunca chamar nada externo (API, e-mail, etc.)
  // dentro de `callback`: rollback nao desfaz efeito externo, e a transacao
  // segura uma conexao do pool pela duracao inteira.
  abstract transaction<T>(callback: (tx: DataAccessPort) => Promise<T>): Promise<T>;
}