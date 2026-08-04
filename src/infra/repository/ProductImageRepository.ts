import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { ProductImage } from "../../domain/entites/ProductImage";

export class ProductImageRepository extends RepositoryPort<ProductImage> {
    private readonly collectionName = "imagens_produto";

    constructor(protected readonly dataAccess: DataAccessPort) {
        super(dataAccess);
    }

    async save(entity: ProductImage): Promise<string | number | undefined> {
        return await this.dataAccess.create(this.collectionName, {
            id: entity.id,
            produto_id: entity.productId,
            url: entity.url,
            ordem: entity.order,
            alt_text: entity.altText,
        });
    }

    async findById(id: string): Promise<ProductImage | undefined> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, { id } as never);
        return data ? this.mapToEntity(data) : undefined;
    }

    async findBy(query: FilterQuery<ProductImage>): Promise<ProductImage | null> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return data ? this.mapToEntity(data) : null;
    }

    async findMany(query: FilterQuery<ProductImage>): Promise<ProductImage[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return rows.map((row) => this.mapToEntity(row));
    }

    async findAll(): Promise<ProductImage[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName);
        return rows.map((row) => this.mapToEntity(row));
    }

    async findManyByIds(ids: string[]): Promise<ProductImage[]> {
        const rows = await this.dataAccess.findManyByField<Record<string, unknown>>(this.collectionName, "id", ids);
        return rows.map((row) => this.mapToEntity(row));
    }

    async exists(filter: Partial<ProductImage>): Promise<boolean> {
        return (await this.dataAccess.count(this.collectionName, this.toColumnQuery(filter))) > 0;
    }

    async update(id: string, entity: Partial<ProductImage>): Promise<void> {
        await this.dataAccess.update(this.collectionName, { id } as never, this.toColumnQuery(entity));
    }

    async delete(id: string): Promise<number> {
        return await this.dataAccess.remove(this.collectionName, { id });
    }

    async decrementFieldIfSufficient(id: string, field: keyof ProductImage & string, amount: number): Promise<boolean> {
        return this.dataAccess.decrementIfSufficient(this.collectionName, id, field, amount);
    }

    private toColumnQuery(entity: Partial<ProductImage>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        if (entity.id !== undefined) columns.id = entity.id;
        if (entity.productId !== undefined) columns.produto_id = entity.productId;
        if (entity.url !== undefined) columns.url = entity.url;
        if (entity.order !== undefined) columns.ordem = entity.order;
        if (entity.altText !== undefined) columns.alt_text = entity.altText;
        if (entity.deleted_at !== undefined) columns.deleted_at = entity.deleted_at;
        return columns;
    }

    private mapToEntity(data: Record<string, unknown>): ProductImage {
        return new ProductImage(
            data.id as string,
            data.produto_id as string,
            data.url as string,
            data.ordem as number,
            (data.alt_text as string | null) ?? null,
            data.created_at ? new Date(data.created_at as string) : new Date(),
            data.updated_at ? new Date(data.updated_at as string) : new Date(),
            data.deleted_at ? new Date(data.deleted_at as string) : null
        );
    }
}
