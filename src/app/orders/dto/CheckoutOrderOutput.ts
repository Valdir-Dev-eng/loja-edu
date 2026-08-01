import { OrderStatus } from "../../../domain/entites/Order";

export interface CheckoutOrderOutput {
    orderId: string;
    status: OrderStatus;
    totalCents: number;
    totalDisplay: string;
    freightCents: number;
    freightDisplay: string;
    grandTotalCents: number;
    grandTotalDisplay: string;
    qrCode: string;
    qrCodeBase64: string;
    expiresAt: Date;
}
