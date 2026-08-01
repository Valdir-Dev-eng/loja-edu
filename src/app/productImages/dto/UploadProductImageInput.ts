export interface UploadProductImageInput {
    productId: string;
    bytes: Buffer;
    filename: string;
    altText: string | null;
}
