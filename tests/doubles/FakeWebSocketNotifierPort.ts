import { OrderStatus } from "../../src/domain/entites/Order";
import { WebSocketNotifierPort } from "../../src/domain/realtime/WebSocketNotifierPort";

export class FakeWebSocketNotifierPort extends WebSocketNotifierPort {
    issuedTicketsForUserIds: string[] = [];
    notifiedUpdates: { userId: string; orderId: string; status: OrderStatus }[] = [];
    private nextTicket = "fake-ticket";

    setNextTicket(ticket: string): void {
        this.nextTicket = ticket;
    }

    async issueConnectionTicket(userId: string): Promise<string> {
        this.issuedTicketsForUserIds.push(userId);
        return this.nextTicket;
    }

    notifyOrderPaymentUpdated(userId: string, orderId: string, status: OrderStatus): void {
        this.notifiedUpdates.push({ userId, orderId, status });
    }
}
