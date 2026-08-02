export interface UploadProductImagesFile {
    bytes: Buffer;
    filename: string;
    altText: string | null;
}

export interface UploadProductImagesInput {
    productId: string;
    files: UploadProductImagesFile[];
}
