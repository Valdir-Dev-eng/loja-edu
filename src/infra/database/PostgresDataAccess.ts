import postgres from 'postgres';
import { DataAccessPort } from '../../domain/database/DataAcess';

export class PostgresDataAccess extends DataAccessPort {
  private readonly connectionOptions: any;
  private readonly allowedFields = ['id', 'name', 'ean', 'price', 'stock', 'discount', 'deleted_at'];

  constructor(connectionString: string) {
    super();
    this.connectionOptions = connectionString;
  }

  
  private async executeQuery<T>(callback: (sql: postgres.Sql) => Promise<T>): Promise<T> {
    const sql = postgres(this.connectionOptions, {
      ssl: 'require',
      connect_timeout: 5,
      max: 1 
    });
    try {
      return await callback(sql);
    } finally {
      await sql.end();
    }
  }

private buildWhere(sql: postgres.Sql, query: Record<string, any>) {
  const keys = Object.keys(query).filter(k => this.allowedFields.includes(k));
  
  
  const conditions = keys.map(key => sql`${sql(key)} = ${query[key]}`);
  
  
  conditions.push(sql`deleted_at IS NULL`);
  
  
  
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
}