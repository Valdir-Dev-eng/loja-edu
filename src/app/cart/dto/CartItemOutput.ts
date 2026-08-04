export interface CartItemOutput {
    productId: string;
    productName: string;
    priceCents: number;
    discountCents: number | null;
    stock: number;
    quantity: number;
}
