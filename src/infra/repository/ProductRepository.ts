import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Product } from "../../domain/entites/Product";
import { Money } from "../../domain/money/Money";

export class ProductRepository extends RepositoryPort<Product> {
  private readonly collectionName = "produtos";

  constructor(protected dataAccess: DataAccessPort) {
    super(dataAccess);
  }

  async save(entity: Product): Promise<string | number | undefined> {
    return await this.dataAccess.create<Record<string, unknown>>(this.collectionName, this.toColumns(entity));
  }

  async findById(id: string): Promise<Product | undefined> {
    const data = await this.dataAccess.findOne<any>(this.collectionName, { id });
    if (!data) return undefined;
    return this.mapToEntity(data);
  }

  async findBy(query: FilterQuery<Product>): Promise<Product | null> {
    const data = await this.dataAccess.findOne<any>(this.collectionName, this.toColumnQuery(query));
    if (!data) return null;
    return this.mapToEntity(data);
  }

  async findByIncludingDeleted(query: FilterQuery<Product>): Promise<Product | null> {
    const data = await this.dataAccess.findOneIncludingDeleted<any>(this.collectionName, this.toColumnQuery(query));
    if (!data) return null;
    return this.mapToEntity(data);
  }

  async findMany(query: FilterQuery<Product>): Promise<Product[]> {
    const dataList = await this.dataAccess.findMany<any>(this.collectionName, this.toColumnQuery(query));
    return dataList.map(data => this.mapToEntity(data));
  }

  async findAll(): Promise<Product[]> {
    const dataList = await this.dataAccess.findMany<any>(this.collectionName);
    return dataList.map(data => this.mapToEntity(data));
  }

  async findManyByIds(ids: string[]): Promise<Product[]> {
    const dataList = await this.dataAccess.findManyByField<any>(this.collectionName, "id", ids);
    return dataList.map(data => this.mapToEntity(data));
  }

  async exists(filter: Partial<Product>): Promise<boolean> {
    const count = await this.dataAccess.count(this.collectionName, this.toColumnQuery(filter));
    return count > 0;
  }

  async update(id: string, entity: Partial<Product>): Promise<void> {
    const updateData = { ...this.toColumnQuery(entity), updated_at: new Date() };
    await this.dataAccess.update(this.collectionName, { id } as any, updateData as any);
  }

  async delete(id: string): Promise<number> {
    return await this.dataAccess.remove(this.collectionName, { id } as any);
  }

  async decrementFieldIfSufficient(id: string, field: keyof Product & string, amount: number): Promise<boolean> {
    return this.dataAccess.decrementIfSufficient(this.collectionName, id, field, amount);
  }

  async updateIfEqual(id: string, field: keyof Product & string, expectedValue: unknown, data: Partial<Product>): Promise<boolean> {
    return this.dataAccess.updateIfEqual(this.collectionName, id, field, expectedValue, this.toColumnQuery(data));
  }

  async incrementField(id: string, field: keyof Product & string, amount: number): Promise<void> {
    await this.dataAccess.incrementField(this.collectionName, id, field, amount);
  }

  private toColumns(entity: Product): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      price: Money.toDecimalString(entity.priceCents),
      discount: entity.discountCents !== null ? Money.toDecimalString(entity.discountCents) : null,
      stock: entity.stock,
      weight: entity.weight,
      width: entity.width,
      height: entity.height,
      length: entity.length,
      categoria_id: entity.categoryId,
    };
  }

  private toColumnQuery(entity: Partial<Product>): Record<string, unknown> {
    const columns: Record<string, unknown> = {};
    if (entity.id !== undefined) columns.id = entity.id;
    if (entity.name !== undefined) columns.name = entity.name;
    if (entity.priceCents !== undefined) columns.price = Money.toDecimalString(entity.priceCents);
    if (entity.discountCents !== undefined)
      columns.discount = entity.discountCents !== null ? Money.toDecimalString(entity.discountCents) : null;
    if (entity.stock !== undefined) columns.stock = entity.stock;
    if (entity.weight !== undefined) columns.weight = entity.weight;
    if (entity.width !== undefined) columns.width = entity.width;
    if (entity.height !== undefined) columns.height = entity.height;
    if (entity.length !== undefined) columns.length = entity.length;
    if (entity.categoryId !== undefined) columns.categoria_id = entity.categoryId;
    return columns;
  }

  private mapToEntity(data: any): Product {
    return new Product(
      data.id,
      data.name,
      Money.fromDecimalString(String(data.price)),
      data.discount !== null && data.discount !== undefined ? Money.fromDecimalString(String(data.discount)) : null,
      data.stock,
      Number(data.weight),
      Number(data.width),
      Number(data.height),
      Number(data.length),
      data.categoria_id ?? null,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.deleted_at ? new Date(data.deleted_at) : null
    );
  }
}
