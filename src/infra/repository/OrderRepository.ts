import { DataAccessPort } from "../../domain/database/DataAcess";
import { Order, OrderItem, OrderStatus } from "../../domain/entites/Order";
import { Money } from "../../domain/money/Money";
import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";

export class OrderRepository extends RepositoryPort<Order> {
    private readonly collectionName = "pedidos";
    private readonly itemsCollectionName = "itens_pedido";

    constructor(protected readonly dataAccess: DataAccessPort) {
        super(dataAccess);
    }

    async save(entity: Order): Promise<string | number | undefined> {
        const id = await this.dataAccess.create(this.collectionName, this.toOrderColumns(entity));
        await Promise.all(entity.items.map((item) => this.saveItem(entity.id, item)));
        return id;
    }

    async findById(id: string): Promise<Order | undefined> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, { id } as never);
        return data ? this.hydrate(data) : undefined;
    }

    async findAll(): Promise<Order[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName);
        return this.hydrateMany(rows);
    }

    async findManyByIds(ids: string[]): Promise<Order[]> {
        const rows = await this.dataAccess.findManyByField<Record<string, unknown>>(this.collectionName, "id", ids);
        return this.hydrateMany(rows);
    }

    async findMany(query: FilterQuery<Order>): Promise<Order[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(
            this.collectionName,
            this.toColumnQuery(query)
        );
        return this.hydrateMany(rows);
    }

    async findBy(query: FilterQuery<Order>): Promise<Order | null> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(
            this.collectionName,
            this.toColumnQuery(query)
        );
        return data ? await this.hydrate(data) : null;
    }

    async update(id: string, entity: Partial<Order>): Promise<void> {
        await this.dataAccess.update(this.collectionName, { id } as never, this.toColumnQuery(entity));
    }

    async exists(filter: Partial<Order>): Promise<boolean> {
        return (await this.dataAccess.count(this.collectionName, this.toColumnQuery(filter))) > 0;
    }

    async delete(id: string): Promise<number> {
        return await this.dataAccess.remove(this.collectionName, { id });
    }

    async decrementFieldIfSufficient(id: string, field: keyof Order & string, amount: number): Promise<boolean> {
        return this.dataAccess.decrementIfSufficient(this.collectionName, id, field, amount);
    }

    async updateIfEqual(id: string, field: keyof Order & string, expectedValue: unknown, data: Partial<Order>): Promise<boolean> {
        return this.dataAccess.updateIfEqual(this.collectionName, id, field, expectedValue, this.toColumnQuery(data));
    }

    async incrementField(id: string, field: keyof Order & string, amount: number): Promise<void> {
        await this.dataAccess.incrementField(this.collectionName, id, field, amount);
    }

    private async hydrate(row: Record<string, unknown>): Promise<Order> {
        const [order] = await this.hydrateMany([row]);
        return order;
    }

    private async hydrateMany(rows: Record<string, unknown>[]): Promise<Order[]> {
        if (rows.length === 0) {
            return [];
        }
        const orderIds = rows.map((row) => row.id as string);
        const itemRows = await this.dataAccess.findManyByField<Record<string, unknown>>(
            this.itemsCollectionName,
            "pedido_id",
            orderIds
        );
        const itemsByOrderId = new Map<string, Record<string, unknown>[]>();
        for (const itemRow of itemRows) {
            const orderId = itemRow.pedido_id as string;
            const items = itemsByOrderId.get(orderId) ?? [];
            items.push(itemRow);
            itemsByOrderId.set(orderId, items);
        }
        return rows.map((row) => this.mapToEntity(row, itemsByOrderId.get(row.id as string) ?? []));
    }

    private async saveItem(orderId: string, item: OrderItem): Promise<void> {
        await this.dataAccess.create(this.itemsCollectionName, {
            pedido_id: orderId,
            produto_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            price_at_purchase: Money.toDecimalString(item.priceCents),
        });
    }

    private toColumnQuery(entity: Partial<Order>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        if (entity.id !== undefined) columns.id = entity.id;
        if (entity.userId !== undefined) columns.user_id = entity.userId;
        if (entity.addressId !== undefined) columns.address_id = entity.addressId;
        if (entity.status !== undefined) columns.status = entity.status;
        if (entity.paymentId !== undefined) columns.payment_id = entity.paymentId;
        if (entity.totalCents !== undefined) columns.total = Money.toDecimalString(entity.totalCents);
        if (entity.freightCents !== undefined) columns.freight = Money.toDecimalString(entity.freightCents);
        if (entity.shippingServiceId !== undefined) columns.shipping_service_id = entity.shippingServiceId;
        if (entity.shippingCartItemId !== undefined) columns.shipping_cart_item_id = entity.shippingCartItemId;
        if (entity.deleted_at !== undefined) columns.deleted_at = entity.deleted_at;
        return columns;
    }

    private toOrderColumns(entity: Order): Record<string, unknown> {
        return {
            id: entity.id,
            user_id: entity.userId,
            address_id: entity.addressId,
            total: Money.toDecimalString(entity.totalCents),
            freight: Money.toDecimalString(entity.freightCents),
            status: entity.status,
            payment_id: entity.paymentId,
            shipping_service_id: entity.shippingServiceId,
            shipping_cart_item_id: entity.shippingCartItemId,
        };
    }

    private mapToEntity(data: Record<string, unknown>, itemRows: Record<string, unknown>[]): Order {
        const items: OrderItem[] = itemRows.map((row) => ({
            productId: row.produto_id as string,
            productName: row.product_name as string,
            priceCents: Money.fromDecimalString(String(row.price_at_purchase)),
            quantity: row.quantity as number,
        }));
        return new Order(
            data.id as string,
            data.user_id as string,
            data.address_id as string,
            items,
            Money.fromDecimalString(String(data.total)),
            Money.fromDecimalString(String(data.freight)),
            data.status as OrderStatus,
            (data.payment_id as string | null) ?? null,
            (data.shipping_service_id as number | null) ?? null,
            (data.shipping_cart_item_id as string | null) ?? null,
            data.created_at ? new Date(data.created_at as string) : new Date(),
            data.updated_at ? new Date(data.updated_at as string) : new Date(),
            data.deleted_at ? new Date(data.deleted_at as string) : null
        );
    }
}
