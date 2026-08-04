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
}