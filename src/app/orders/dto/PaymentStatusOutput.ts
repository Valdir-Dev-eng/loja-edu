import { OrderStatus } from "../../../domain/entites/Order";

export interface PaymentStatusOutput {
    orderId: string;
    status: OrderStatus;
}
