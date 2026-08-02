import { CachePort } from "../../../domain/database/CachePort";
import { Product } from "../../../domain/entites/Product";
import { ProductImage } from "../../../domain/entites/ProductImage";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { ImageStorageGatewayPort } from "../../../domain/image/ImageStorageGatewayPort";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ImageFileValidator } from "../../../infra/validators/ImageFileValidator";
import { UploadProductImagesInput } from "../dto/UploadProductImagesInput";
import { ProductImageOutput } from "../dto/ProductImageOutput";
import { productImagesCacheKey } from "../ProductImageCacheKeys";

const MAX_IMAGES_PER_PRODUCT = 6;

export class UploadProductImages {
    constructor(
        private productRepo: RepositoryPort<Product>,
        private imageRepo: RepositoryPort<ProductImage>,
        private imageStorage: ImageStorageGatewayPort,
        private cache: CachePort,
        private createId: CreateId
    ) {}

    async execute(input: UploadProductImagesInput): Promise<ProductImageOutput[]> {
        const product = await this.productRepo.findById(input.productId);
        if (!product) {
            throw new NotFoundError("Produto não encontrado.");
        }

        if (input.files.length === 0) {
            throw new BusinessRuleError("Nenhum arquivo enviado.");
        }

        const existingImages = await this.imageRepo.findMany({ productId: input.productId });
        if (existingImages.length + input.files.length > MAX_IMAGES_PER_PRODUCT) {
            throw new BusinessRuleError(`Um produto pode ter no máximo ${MAX_IMAGES_PER_PRODUCT} imagens.`);
        }

        const detectedTypes = input.files.map((file) => {
            const detectedType = ImageFileValidator.detectImageType(file.bytes);
            if (!detectedType) {
                throw new BusinessRuleError(`Arquivo "${file.filename}" não é uma imagem válida.`);
            }
            return detectedType;
        });

        const savedImages: ProductImage[] = [];
        let nextOrder = existingImages.length;
        for (let index = 0; index < input.files.length; index++) {
            const file = input.files[index];
            const storagePath = `/products/${product.id}/${this.createId()}-${file.filename}`;
            const uploaded = await this.imageStorage.upload({
                bytes: file.bytes,
                filename: storagePath,
                contentType: detectedTypes[index],
            });

            const image = ProductImage.build(this.createId, product.id, uploaded.url, nextOrder, file.altText);
            await this.imageRepo.save(image);
            savedImages.push(image);
            nextOrder += 1;
        }

        await this.cache.del(productImagesCacheKey(product.id));

        return savedImages.map((image) => ({
            id: image.id,
            productId: image.productId,
            url: image.url,
            order: image.order,
            altText: image.altText,
        }));
    }
}
