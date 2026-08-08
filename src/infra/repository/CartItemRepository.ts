import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { CartItem } from "../../domain/entites/CartItem";

export class CartItemRepository extends RepositoryPort<CartItem> {
    private readonly collectionName = "itens_carrinho";

    constructor(protected readonly dataAccess: DataAccessPort) {
        super(dataAccess);
    }

    async save(entity: CartItem): Promise<string | number | undefined> {
        return await this.dataAccess.create(this.collectionName, this.toColumns(entity));
    }

    async findById(id: string): Promise<CartItem | undefined> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, { id } as never);
        return data ? this.mapToEntity(data) : undefined;
    }

    async findBy(query: FilterQuery<CartItem>): Promise<CartItem | null> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return data ? this.mapToEntity(data) : null;
    }

    async findMany(query: FilterQuery<CartItem>): Promise<CartItem[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return rows.map((row) => this.mapToEntity(row));
    }

    async findAll(): Promise<CartItem[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName);
        return rows.map((row) => this.mapToEntity(row));
    }

    async findManyByIds(ids: string[]): Promise<CartItem[]> {
        const rows = await this.dataAccess.findManyByField<Record<string, unknown>>(this.collectionName, "id", ids);
        return rows.map((row) => this.mapToEntity(row));
    }

    async update(id: string, entity: Partial<CartItem>): Promise<void> {
        await this.dataAccess.update(this.collectionName, { id } as never, this.toColumnQuery(entity));
    }

    async exists(filter: Partial<CartItem>): Promise<boolean> {
        return (await this.dataAccess.count(this.collectionName, this.toColumnQuery(filter))) > 0;
    }

    async delete(id: string): Promise<number> {
        return await this.dataAccess.remove(this.collectionName, { id });
    }

    async decrementFieldIfSufficient(id: string, field: keyof CartItem & string, amount: number): Promise<boolean> {
        return this.dataAccess.decrementIfSufficient(this.collectionName, id, field, amount);
    }

    async updateIfEqual(id: string, field: keyof CartItem & string, expectedValue: unknown, data: Partial<CartItem>): Promise<boolean> {
        return this.dataAccess.updateIfEqual(this.collectionName, id, field, expectedValue, this.toColumnQuery(data));
    }

    async incrementField(id: string, field: keyof CartItem & string, amount: number): Promise<void> {
        await this.dataAccess.incrementField(this.collectionName, id, field, amount);
    }

    private toColumns(entity: CartItem): Record<string, unknown> {
        return {
            id: entity.id,
            cart_id: entity.cartId,
            produto_id: entity.productId,
            quantity: entity.quantity,
        };
    }

    private toColumnQuery(entity: Partial<CartItem>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        if (entity.id !== undefined) columns.id = entity.id;
        if (entity.cartId !== undefined) columns.cart_id = entity.cartId;
        if (entity.productId !== undefined) columns.produto_id = entity.productId;
        if (entity.quantity !== undefined) columns.quantity = entity.quantity;
        if (entity.deleted_at !== undefined) columns.deleted_at = entity.deleted_at;
        return columns;
    }

    private mapToEntity(data: Record<string, unknown>): CartItem {
        return new CartItem(
            data.id as string,
            data.cart_id as string,
            data.produto_id as string,
            data.quantity as number,
            data.created_at ? new Date(data.created_at as string) : new Date(),
            data.updated_at ? new Date(data.updated_at as string) : new Date(),
            data.deleted_at ? new Date(data.deleted_at as string) : null
        );
    }
}
