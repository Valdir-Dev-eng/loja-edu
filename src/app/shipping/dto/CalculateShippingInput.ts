export interface CalculateShippingItemInput {
    productId: string;
    quantity: number;
}

export interface CalculateShippingInput {
    destinationPostalCode: string;
    items: CalculateShippingItemInput[];
}
