import { CachePort } from "../../../domain/database/CachePort";
import { ProductImage } from "../../../domain/entites/ProductImage";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ProductImageOutput } from "../dto/ProductImageOutput";
import { PRODUCT_IMAGES_CACHE_TTL_SECONDS, productImagesCacheKey } from "../ProductImageCacheKeys";

export class ListProductImages {
    constructor(private imageRepo: RepositoryPort<ProductImage>, private cache: CachePort) {}

    async execute(productId: string): Promise<ProductImageOutput[]> {
        const cacheKey = productImagesCacheKey(productId);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as ProductImageOutput[];
        }

        const images = await this.imageRepo.findMany({ productId });
        const output = images
            .slice()
            .sort((first, second) => first.order - second.order)
            .map((image) => ({
                id: image.id,
                productId: image.productId,
                url: image.url,
                order: image.order,
                altText: image.altText,
            }));

        await this.cache.set(cacheKey, JSON.stringify(output), PRODUCT_IMAGES_CACHE_TTL_SECONDS);
        return output;
    }
}
