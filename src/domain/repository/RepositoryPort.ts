import { DataAccessPort } from "../database/DataAcess";

export abstract class RepositoryPort<T> {
  constructor(protected readonly dataAccess: DataAccessPort) {}

  abstract save(entity: T): Promise<string | number | undefined>;
  abstract findById(id: string): Promise<T | undefined>;
  abstract findAll(): Promise<T[]>;
abstract update(id: string, entity: Partial<T>): Promise<void>;
  abstract exists(filter: Partial<T>): Promise<boolean>;
  abstract delete(id: string): Promise<number>;
}