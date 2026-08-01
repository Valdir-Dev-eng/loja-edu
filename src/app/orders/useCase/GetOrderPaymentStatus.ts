import { Order, OrderStatus } from "../../../domain/entites/Order";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { GetOrderPaymentStatusInput } from "../dto/GetOrderPaymentStatusInput";
import { PaymentStatusOutput } from "../dto/PaymentStatusOutput";
import { ProcessPaymentWebhook } from "./ProcessPaymentWebhook";

export class GetOrderPaymentStatus {
    constructor(private orderRepo: RepositoryPort<Order>, private processPaymentWebhook: ProcessPaymentWebhook) {}

    async execute(input: GetOrderPaymentStatusInput): Promise<PaymentStatusOutput> {
        const order = await this.orderRepo.findById(input.orderId);
        if (!order || order.userId !== input.userId) {
            throw new NotFoundError("Pedido não encontrado.");
        }

        if (order.status === OrderStatus.PENDING_PAYMENT && order.paymentId) {
            await this.tryReconcileWithGateway(order.paymentId);
        }

        const current = await this.orderRepo.findById(input.orderId);
        return { orderId: current!.id, status: current!.status };
    }

    private async tryReconcileWithGateway(paymentId: string): Promise<void> {
        try {
            await this.processPaymentWebhook.execute({ externalPaymentId: paymentId });
        } catch {
            return;
        }
    }
}
