export interface CheckoutOrderItemInput {
    productId: string;
    quantity: number;
}

export interface CheckoutOrderInput {
    userId: string;
    addressId: string;
    shippingServiceId: number;
    items: CheckoutOrderItemInput[];
}
