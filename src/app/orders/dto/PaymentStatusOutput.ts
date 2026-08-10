import { OrderStatus } from "../../../domain/entites/Order";

export interface PaymentStatusOutput {
    orderId: string;
    status: OrderStatus;
    qrCode?: string;
    qrCodeBase64?: string;
    expiresAt?: Date;
}
