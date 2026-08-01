export interface ProductInput {
    name: string;
    priceCents: number;
    discountCents: number | null;
    stock: number;
    weight: number;
    width: number;
    height: number;
    length: number;
    categoryId: string | null;
}
