import { Order } from "../../../domain/entites/Order";
import { Money } from "../../../domain/money/Money";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { OrderOutput } from "../dto/OrderOutput";

export class GetMyOrders {
    constructor(private orderRepo: RepositoryPort<Order>) {}

    async execute(userId: string): Promise<OrderOutput[]> {
        const orders = await this.orderRepo.findMany({ userId });
        return orders.map((order) => this.toOutput(order));
    }

    private toOutput(order: Order): OrderOutput {
        return {
            id: order.id,
            status: order.status,
            totalCents: order.totalCents,
            totalDisplay: Money.toDisplay(order.totalCents),
            paymentId: order.paymentId,
            createdAt: order.created_at,
            items: order.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                priceCents: item.priceCents,
                priceDisplay: Money.toDisplay(item.priceCents),
            })),
        };
    }
}
