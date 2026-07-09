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

  return new Product(
    data.id, data.name, data.price, data.discount, data.stock,
    new Date(data.created_at), new Date(data.updated_at), 
    data.deleted_at ? new Date(data.deleted_at) : null
  );
}

async findAll(): Promise<Product[]> {
  const dataList = await this.dataAccess.findMany<Product>(this.collectionName);
  
  return dataList.map(data => new Product(
    data.id, data.name, data.price, data.discount, data.stock,
    new Date(data.created_at), new Date(data.updated_at), 
    data.deleted_at ? new Date(data.deleted_at) : null
  ));
}
  async exists(filter: Partial<Product>): Promise<boolean> {
    const count = await this.dataAccess.count(this.collectionName, filter);
    return count > 0;
}

async update(id: string, entity: Partial<Product>): Promise<void> {
  await this.dataAccess.update(this.collectionName, { id } as any, entity as any);
}


  async delete(id: string): Promise<number> {
    return await this.dataAccess.remove(this.collectionName, { id });
  }
}