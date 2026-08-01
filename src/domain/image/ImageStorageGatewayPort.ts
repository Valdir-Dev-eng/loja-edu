export interface UploadImageInput {
    bytes: Buffer;
    filename: string;
    contentType: string;
}

export interface UploadImageOutput {
    url: string;
}

export abstract class ImageStorageGatewayPort {
    abstract upload(input: UploadImageInput): Promise<UploadImageOutput>;
    abstract remove(url: string): Promise<void>;
}
