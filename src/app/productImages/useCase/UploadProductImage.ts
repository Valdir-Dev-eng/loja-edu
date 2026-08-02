import { CachePort } from "../../../domain/database/CachePort";
import { Product } from "../../../domain/entites/Product";
import { ProductImage } from "../../../domain/entites/ProductImage";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { ImageStorageGatewayPort } from "../../../domain/image/ImageStorageGatewayPort";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ImageFileValidator } from "../../../infra/validators/ImageFileValidator";
import { UploadProductImageInput } from "../dto/UploadProductImageInput";
import { ProductImageOutput } from "../dto/ProductImageOutput";
import { productImagesCacheKey } from "../ProductImageCacheKeys";

const MAX_IMAGES_PER_PRODUCT = 6;

export class UploadProductImage {
    constructor(
        private productRepo: RepositoryPort<Product>,
        private imageRepo: RepositoryPort<ProductImage>,
        private imageStorage: ImageStorageGatewayPort,
        private cache: CachePort,
        private createId: CreateId
    ) {}

    async execute(input: UploadProductImageInput): Promise<ProductImageOutput> {
        const product = await this.productRepo.findById(input.productId);
        if (!product) {
            throw new NotFoundError("Produto não encontrado.");
        }

        const existingImages = await this.imageRepo.findMany({ productId: input.productId });
        if (existingImages.length >= MAX_IMAGES_PER_PRODUCT) {
            throw new BusinessRuleError(`Um produto pode ter no máximo ${MAX_IMAGES_PER_PRODUCT} imagens.`);
        }

        const detectedType = ImageFileValidator.detectImageType(input.bytes);
        if (!detectedType) {
            throw new BusinessRuleError("Arquivo enviado não é uma imagem válida.");
        }

        const storagePath = `/products/${product.id}/${this.createId()}-${input.filename}`;
        const uploaded = await this.imageStorage.upload({
            bytes: input.bytes,
            filename: storagePath,
            contentType: detectedType,
        });

        const image = ProductImage.build(this.createId, product.id, uploaded.url, existingImages.length, input.altText);
        await this.imageRepo.save(image);
        await this.cache.del(productImagesCacheKey(product.id));

        return {
            id: image.id,
            productId: image.productId,
            url: image.url,
            order: image.order,
            altText: image.altText,
        };
    }
}
