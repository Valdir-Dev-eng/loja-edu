import { CachePort } from "../../../domain/database/CachePort";
import { ProductImage } from "../../../domain/entites/ProductImage";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { ImageStorageGatewayPort } from "../../../domain/image/ImageStorageGatewayPort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { DeleteProductImageInput } from "../dto/DeleteProductImageInput";
import { productImagesCacheKey } from "../ProductImageCacheKeys";

export class DeleteProductImage {
    constructor(
        private imageRepo: RepositoryPort<ProductImage>,
        private imageStorage: ImageStorageGatewayPort,
        private cache: CachePort
    ) {}

    async execute(input: DeleteProductImageInput): Promise<void> {
        const image = await this.imageRepo.findById(input.imageId);
        if (!image || image.productId !== input.productId) {
            throw new NotFoundError("Imagem não encontrada.");
        }

        await this.imageStorage.remove(image.url);
        image.softDelete();
        await this.imageRepo.update(image.id, image);
        await this.cache.del(productImagesCacheKey(image.productId));
    }
}
