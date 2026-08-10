import { Order, OrderStatus } from "../../../domain/entites/Order";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { PaymentNotFoundError } from "../../../domain/payment/PaymentNotFoundError";
import { PaymentStatusResult } from "../../../domain/payment/PaymentGatewayPort";
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

        let gatewayResult: PaymentStatusResult | null = null;
        if (order.status === OrderStatus.PENDING_PAYMENT && order.paymentId) {
            gatewayResult = await this.tryReconcileWithGateway(order);
        }

        const current = await this.orderRepo.findById(input.orderId);
        const output: PaymentStatusOutput = { orderId: current!.id, status: current!.status };
        // So expoe o QR se o pedido continuar pendente apos a reconciliacao —
        // se o gateway ja aprovou/recusou/cancelou, mostrar um QR pago pra
        // pagar de novo so confundiria o usuario.
        if (current!.status === OrderStatus.PENDING_PAYMENT && gatewayResult?.qrCode) {
            output.qrCode = gatewayResult.qrCode;
            output.qrCodeBase64 = gatewayResult.qrCodeBase64;
            output.expiresAt = gatewayResult.expiresAt;
        }
        return output;
    }

    private async tryReconcileWithGateway(order: Order): Promise<PaymentStatusResult | null> {
        try {
            return await this.processPaymentWebhook.execute({ externalPaymentId: order.paymentId! });
        } catch (error) {
            if (error instanceof PaymentNotFoundError) {
                await this.processPaymentWebhook.expireAbandonedPayment(order);
            }
            return null;
        }
    }
}
