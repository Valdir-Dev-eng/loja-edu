import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Category } from "../../domain/entites/Category";

export class CategoryRepository extends RepositoryPort<Category> {
    private readonly collectionName = "categorias";

    constructor(protected readonly dataAccess: DataAccessPort) {
        super(dataAccess);
    }

    async save(entity: Category): Promise<string | number | undefined> {
        return await this.dataAccess.create(this.collectionName, {
            id: entity.id,
            name: entity.name,
            description: entity.description,
        });
    }

    async findById(id: string): Promise<Category | undefined> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, { id } as never);
        return data ? this.mapToEntity(data) : undefined;
    }

    async findBy(query: FilterQuery<Category>): Promise<Category | null> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return data ? this.mapToEntity(data) : null;
    }

    async findMany(query: FilterQuery<Category>): Promise<Category[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return rows.map((row) => this.mapToEntity(row));
    }

    async findAll(): Promise<Category[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName);
        return rows.map((row) => this.mapToEntity(row));
    }

    async findManyByIds(ids: string[]): Promise<Category[]> {
        const rows = await this.dataAccess.findManyByField<Record<string, unknown>>(this.collectionName, "id", ids);
        return rows.map((row) => this.mapToEntity(row));
    }

    async exists(filter: Partial<Category>): Promise<boolean> {
        return (await this.dataAccess.count(this.collectionName, this.toColumnQuery(filter))) > 0;
    }

    async update(id: string, entity: Partial<Category>): Promise<void> {
        await this.dataAccess.update(this.collectionName, { id } as never, this.toColumnQuery(entity));
    }

    async delete(id: string): Promise<number> {
        return await this.dataAccess.remove(this.collectionName, { id });
    }

    async decrementFieldIfSufficient(id: string, field: keyof Category & string, amount: number): Promise<boolean> {
        return this.dataAccess.decrementIfSufficient(this.collectionName, id, field, amount);
    }

    async updateIfEqual(id: string, field: keyof Category & string, expectedValue: unknown, data: Partial<Category>): Promise<boolean> {
        return this.dataAccess.updateIfEqual(this.collectionName, id, field, expectedValue, this.toColumnQuery(data));
    }

    async incrementField(id: string, field: keyof Category & string, amount: number): Promise<void> {
        await this.dataAccess.incrementField(this.collectionName, id, field, amount);
    }

    private toColumnQuery(entity: Partial<Category>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        if (entity.id !== undefined) columns.id = entity.id;
        if (entity.name !== undefined) columns.name = entity.name;
        if (entity.description !== undefined) columns.description = entity.description;
        if (entity.deleted_at !== undefined) columns.deleted_at = entity.deleted_at;
        return columns;
    }

    private mapToEntity(data: Record<string, unknown>): Category {
        return new Category(
            data.id as string,
            data.name as string,
            (data.description as string | null) ?? null,
            data.created_at ? new Date(data.created_at as string) : new Date(),
            data.updated_at ? new Date(data.updated_at as string) : new Date(),
            data.deleted_at ? new Date(data.deleted_at as string) : null
        );
    }
}
