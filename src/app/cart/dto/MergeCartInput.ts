export interface MergeCartItemInput {
    productId: string;
    quantity: number;
}

export interface MergeCartInput {
    userId: string;
    items: MergeCartItemInput[];
}
