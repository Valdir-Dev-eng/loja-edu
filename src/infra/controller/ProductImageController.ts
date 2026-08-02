import { DeleteProductImageInput } from "../../app/productImages/dto/DeleteProductImageInput";
import { UploadProductImagesInput } from "../../app/productImages/dto/UploadProductImagesInput";
import { DeleteProductImage } from "../../app/productImages/useCase/DeleteProductImage";
import { ListProductImages } from "../../app/productImages/useCase/ListProductImages";
import { UploadProductImages } from "../../app/productImages/useCase/UploadProductImages";

export class ProductImageController {
    constructor(
        private uploadProductImages: UploadProductImages,
        private deleteProductImage: DeleteProductImage,
        private listProductImages: ListProductImages
    ) {}

    async upload(input: UploadProductImagesInput) {
        return await this.uploadProductImages.execute(input);
    }

    async delete(input: DeleteProductImageInput) {
        await this.deleteProductImage.execute(input);
    }

    async list(productId: string) {
        return await this.listProductImages.execute(productId);
    }
}
