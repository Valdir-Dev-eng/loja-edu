import { ImageStorageGatewayPort, UploadImageInput, UploadImageOutput } from "../../src/domain/image/ImageStorageGatewayPort";

export class FakeImageStorageGatewayPort extends ImageStorageGatewayPort {
    public uploadedFiles: UploadImageInput[] = [];
    public removedUrls: string[] = [];
    private shouldFailNextUpload = false;

    failNextUpload(): void {
        this.shouldFailNextUpload = true;
    }

    async upload(input: UploadImageInput): Promise<UploadImageOutput> {
        if (this.shouldFailNextUpload) {
            this.shouldFailNextUpload = false;
            throw new Error("Falha simulada de upload no Sirv.");
        }
        this.uploadedFiles.push(input);
        return { url: `https://fake.sirv.com${input.filename}` };
    }

    async remove(url: string): Promise<void> {
        this.removedUrls.push(url);
    }
}
