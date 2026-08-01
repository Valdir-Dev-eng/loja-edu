import { Order, OrderStatus } from "../../../domain/entites/Order";
import { Product } from "../../../domain/entites/Product";
import { ConflictError } from "../../../domain/errors/ConflictError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { PaymentGatewayPort, PaymentStatus } from "../../../domain/payment/PaymentGatewayPort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ProcessPaymentWebhookInput } from "../dto/ProcessPaymentWebhookInput";

export class ProcessPaymentWebhook {
    constructor(
        private orderRepo: RepositoryPort<Order>,
        private productRepo: RepositoryPort<Product>,
        private paymentGateway: PaymentGatewayPort
    ) {}

    async execute(input: ProcessPaymentWebhookInput): Promise<void> {
        const result = await this.paymentGateway.getPaymentStatus(input.externalPaymentId);
        const order = await this.orderRepo.findById(result.orderId);
        if (!order) {
            throw new NotFoundError("Pedido não encontrado.");
        }

        switch (result.status) {
            case PaymentStatus.APPROVED:
                await this.handleApproved(order, result.paidAmountCents);
                return;
            case PaymentStatus.REJECTED:
                await this.handleReleaseStock(order, OrderStatus.REJECTED);
                return;
            case PaymentStatus.CANCELLED:
                await this.handleReleaseStock(order, OrderStatus.CANCELLED);
                return;
            case PaymentStatus.REFUNDED:
                await this.handleTerminalFromPaid(order, OrderStatus.REFUNDED);
                return;
            case PaymentStatus.CHARGED_BACK:
                await this.handleTerminalFromPaid(order, OrderStatus.CHARGEBACK);
                return;
            case PaymentStatus.PENDING:
                return;
        }
    }

    private async handleApproved(order: Order, paidAmountCents: number): Promise<void> {
        if (order.status === OrderStatus.PAID) {
            return;
        }
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
            throw new ConflictError("Pedido não está mais aguardando pagamento.");
        }
        order.markAsPaid(paidAmountCents);
        await this.orderRepo.update(order.id, { status: order.status });
    }

    private async handleReleaseStock(order: Order, target: OrderStatus): Promise<void> {
        if (order.status === target) {
            return;
        }
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
            throw new ConflictError("Pedido não está mais aguardando pagamento.");
        }
        if (target === OrderStatus.REJECTED) {
            order.markAsRejected();
        } else {
            order.markAsCancelled();
        }
        await this.orderRepo.update(order.id, { status: order.status });
        await Promise.all(order.items.map((item) => this.restoreStock(item.productId, item.quantity)));
    }

    private async handleTerminalFromPaid(order: Order, target: OrderStatus): Promise<void> {
        if (order.status === target) {
            return;
        }
        if (order.status !== OrderStatus.PAID) {
            throw new ConflictError("Pedido não está pago para poder sofrer esse ajuste.");
        }
        if (target === OrderStatus.REFUNDED) {
            order.markAsRefunded();
        } else {
            order.markAsChargedBack();
        }
        await this.orderRepo.update(order.id, { status: order.status });
    }

    private async restoreStock(productId: string, quantity: number): Promise<void> {
        const product = await this.productRepo.findById(productId);
        if (product) {
            await this.productRepo.update(product.id, { stock: product.stock + quantity });
        }
    }
}
