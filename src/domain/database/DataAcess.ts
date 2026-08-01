export abstract class DataAccessPort {
  abstract findMany<T extends object>(collectionName: string, query?: Partial<T>, selectFields?: (keyof T)[]): Promise<T[]>;
  abstract findOne<T extends object>(collectionName: string, query: Partial<T>, selectFields?: (keyof T)[]): Promise<T | undefined>;
  abstract create<T extends object>(collectionName: string, data: Partial<T>): Promise<string | number | undefined>;
  abstract update<T extends object>(collectionName: string, query: Partial<T>, data: Partial<T>): Promise<number>;
  abstract findBy<T extends object>(query: Partial<T>): Promise<T | null> ;
  abstract remove(collectionName: string, query: Partial<any>): Promise<number>;
  abstract count<T extends object>(collectionName: string, query: Partial<T>): Promise<number>;
}