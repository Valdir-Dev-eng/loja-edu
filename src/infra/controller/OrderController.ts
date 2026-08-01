import { AdminOrderOutput } from "../../app/orders/dto/AdminOrderOutput";
import { AdminOrderTab } from "../../app/orders/dto/ListOrdersForAdminInput";
import { CheckoutOrderInput } from "../../app/orders/dto/CheckoutOrderInput";
import { CheckoutOrderOutput } from "../../app/orders/dto/CheckoutOrderOutput";
import { OrderOutput } from "../../app/orders/dto/OrderOutput";
import { PaymentStatusOutput } from "../../app/orders/dto/PaymentStatusOutput";
import { CheckoutOrder } from "../../app/orders/useCase/CheckoutOrder";
import { GetMyOrders } from "../../app/orders/useCase/GetMyOrders";
import { GetOrderPaymentStatus } from "../../app/orders/useCase/GetOrderPaymentStatus";
import { ListOrdersForAdmin } from "../../app/orders/useCase/ListOrdersForAdmin";
import { ProcessPaymentWebhook } from "../../app/orders/useCase/ProcessPaymentWebhook";

export class OrderController {
    constructor(
        private checkoutOrder: CheckoutOrder,
        private processPaymentWebhook: ProcessPaymentWebhook,
        private getMyOrders: GetMyOrders,
        private getOrderPaymentStatus: GetOrderPaymentStatus,
        private listOrdersForAdmin: ListOrdersForAdmin
    ) {}

    async checkout(input: CheckoutOrderInput): Promise<CheckoutOrderOutput> {
        return await this.checkoutOrder.execute(input);
    }

    async processWebhook(externalPaymentId: string): Promise<void> {
        await this.processPaymentWebhook.execute({ externalPaymentId });
    }

    async myOrders(userId: string): Promise<OrderOutput[]> {
        return await this.getMyOrders.execute(userId);
    }

    async paymentStatus(orderId: string, userId: string): Promise<PaymentStatusOutput> {
        return await this.getOrderPaymentStatus.execute({ orderId, userId });
    }

    async adminList(tab: AdminOrderTab): Promise<AdminOrderOutput[]> {
        return await this.listOrdersForAdmin.execute({ tab });
    }
}
