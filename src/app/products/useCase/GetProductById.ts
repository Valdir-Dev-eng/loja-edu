import { CachePort } from "../../../domain/database/CachePort";
import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ProductOutput } from "../dto/ProductOutput";
import { PRODUCTS_CACHE_TTL_SECONDS, productByIdCacheKey } from "../ProductCacheKeys";

export class GetProductById {
    constructor(private repo: RepositoryPort<Product>, private cache: CachePort) {}

    async execute(id: string): Promise<ProductOutput> {
        const cacheKey = productByIdCacheKey(id);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as ProductOutput;
        }

        const product = await this.repo.findById(id);
        if (!product) {
            throw new NotFoundError("Produto não encontrado.");
        }
        const output: ProductOutput = {
            id: product.id,
            name: product.name,
            priceCents: product.priceCents,
            discountCents: product.discountCents,
            stock: product.stock,
            weight: product.weight,
            width: product.width,
            height: product.height,
            length: product.length,
            categoryId: product.categoryId,
        };

        await this.cache.set(cacheKey, JSON.stringify(output), PRODUCTS_CACHE_TTL_SECONDS);
        return output;
    }
}
