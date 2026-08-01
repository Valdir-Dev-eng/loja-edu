import { DeleteProductImageInput } from "../../app/productImages/dto/DeleteProductImageInput";
import { UploadProductImageInput } from "../../app/productImages/dto/UploadProductImageInput";
import { DeleteProductImage } from "../../app/productImages/useCase/DeleteProductImage";
import { ListProductImages } from "../../app/productImages/useCase/ListProductImages";
import { UploadProductImage } from "../../app/productImages/useCase/UploadProductImage";

export class ProductImageController {
    constructor(
        private uploadProductImage: UploadProductImage,
        private deleteProductImage: DeleteProductImage,
        private listProductImages: ListProductImages
    ) {}

    async upload(input: UploadProductImageInput) {
        return await this.uploadProductImage.execute(input);
    }

    async delete(input: DeleteProductImageInput) {
        await this.deleteProductImage.execute(input);
    }

    async list(productId: string) {
        return await this.listProductImages.execute(productId);
    }
}
