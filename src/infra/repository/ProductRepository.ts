import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Product } from "../../domain/entites/Product";

export class ProductRepository extends RepositoryPort<Product> {
  private readonly collectionName = "produtos";

  constructor(dataAccess: DataAccessPort) {
    super(dataAccess);
  }

  async save(entity: Product): Promise<string | number | undefined> {
    return await this.dataAccess.create<Product>(this.collectionName, entity);
  }

async findById(id: string): Promise<Product | undefined> {
  const data = await this.dataAccess.findOne<Product>(this.collectionName, { id } as any);
  if (!data) return undefined;

  return Object.assign(Object.create(Product.prototype), data);
}

  async exists(filter: Partial<Product>): Promise<boolean> {
    const count = await this.dataAccess.count(this.collectionName, filter);
    return count > 0;
}

async update(id: string, entity: Partial<Product>): Promise<void> {
  await this.dataAccess.update(this.collectionName, { id } as any, entity as any);
}

  async findAll(): Promise<Product[]> {
    return await this.dataAccess.findMany<Product>(this.collectionName);
  }

  async delete(id: string): Promise<number> {
    return await this.dataAccess.remove(this.collectionName, { id });
  }
}