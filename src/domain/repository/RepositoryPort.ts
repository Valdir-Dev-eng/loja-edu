import { DataAccessPort } from "../database/DataAcess";

export type FilterQuery<T> = {
    [P in keyof T]?: T[P];
};

export abstract class RepositoryPort<T> {
  constructor(protected readonly dataAccess: DataAccessPort) {}

  abstract save(entity: T): Promise<string | number | undefined>;
  abstract findById(id: string): Promise<T | undefined>;
  abstract findManyByIds(ids: string[]): Promise<T[]>;
  abstract findAll(): Promise<T[]>;
  abstract update(id: string, entity: Partial<T>): Promise<void>;
  abstract findBy(query: FilterQuery<T>): Promise<T | null>;
  abstract findMany(query: FilterQuery<T>): Promise<T[]>;

  abstract exists(filter: Partial<T>): Promise<boolean>;
  abstract delete(id: string): Promise<number>;
  abstract decrementFieldIfSufficient(id: string, field: keyof T & string, amount: number): Promise<boolean>;

  // CAS generico — cada repo concreto delega pro dataAccess.updateIfEqual
  // passando sua propria collectionName, mesmo precedente do
  // decrementFieldIfSufficient.
  abstract updateIfEqual(id: string, field: keyof T & string, expectedValue: unknown, data: Partial<T>): Promise<boolean>;

  // Incremento atomico, simetrico ao decrementFieldIfSufficient.
  abstract incrementField(id: string, field: keyof T & string, amount: number): Promise<void>;

  // Clona este repositorio amarrado a uma transacao (tx) em vez do pool
  // default — generico porque todo repo concreto tem o mesmo shape de
  // construtor, (dataAccess: DataAccessPort). A use case so enxerga a porta
  // (RepositoryPort<T>), nunca a classe concreta.
  withTransaction(tx: DataAccessPort): this {
    const Ctor = this.constructor as new (dataAccess: DataAccessPort) => this;
    return new Ctor(tx);
  }
}