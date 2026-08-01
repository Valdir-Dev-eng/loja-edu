import { OrderStatus } from "../../../domain/entites/Order";

export interface OrderItemOutput {
    productId: string;
    productName: string;
    quantity: number;
    priceCents: number;
    priceDisplay: string;
}

export interface OrderOutput {
    id: string;
    status: OrderStatus;
    totalCents: number;
    totalDisplay: string;
    items: OrderItemOutput[];
    paymentId: string | null;
    createdAt: Date;
}
