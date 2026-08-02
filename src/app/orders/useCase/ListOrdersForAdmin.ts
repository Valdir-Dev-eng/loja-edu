import { Order, OrderStatus } from "../../../domain/entites/Order";
import { User } from "../../../domain/entites/User";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { Money } from "../../../domain/money/Money";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { AdminOrderOutput } from "../dto/AdminOrderOutput";
import { AdminOrderTab, ListOrdersForAdminInput } from "../dto/ListOrdersForAdminInput";

const STATUSES_BY_TAB: Record<AdminOrderTab, OrderStatus[]> = {
    paid: [OrderStatus.PAID],
    pending: [OrderStatus.PENDING_PAYMENT, OrderStatus.EXPIRED, OrderStatus.REJECTED],
    refunded: [OrderStatus.REFUNDED, OrderStatus.CHARGEBACK],
};

export class ListOrdersForAdmin {
    constructor(private orderRepo: RepositoryPort<Order>, private userRepo: RepositoryPort<User>) {}

    async execute(input: ListOrdersForAdminInput): Promise<AdminOrderOutput[]> {
        const statuses = STATUSES_BY_TAB[input.tab];
        if (!statuses) {
            throw new BusinessRuleError("Aba de pedidos inválida.");
        }

        const ordersByStatus = await Promise.all(statuses.map((status) => this.orderRepo.findMany({ status })));
        const orders = ordersByStatus.flat();

        const buyerIds = [...new Set(orders.map((order) => order.userId))];
        const buyers = await this.userRepo.findManyByIds(buyerIds);
        const buyersById = new Map(buyers.map((buyer) => [buyer.id, buyer]));

        return orders.map((order) => this.toOutput(order, buyersById.get(order.userId)));
    }

    private toOutput(order: Order, buyer: User | undefined): AdminOrderOutput {
        return {
            id: order.id,
            status: order.status,
            totalCents: order.totalCents,
            totalDisplay: Money.toDisplay(order.totalCents),
            paymentId: order.paymentId,
            createdAt: order.created_at,
            buyerEmail: buyer?.email ?? "desconhecido",
            buyerUsername: buyer?.username ?? "desconhecido",
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
