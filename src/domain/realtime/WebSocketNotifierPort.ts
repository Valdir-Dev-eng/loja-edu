import { OrderStatus } from "../entites/Order";

export abstract class WebSocketNotifierPort {
    abstract issueConnectionTicket(userId: string): Promise<string>;
    abstract notifyOrderPaymentUpdated(userId: string, orderId: string, status: OrderStatus): void;
}
