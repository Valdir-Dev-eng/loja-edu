import { CachePort } from "../../../domain/database/CachePort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { PRODUCTS_ALL_CACHE_KEY, productByIdCacheKey } from "../ProductCacheKeys";

export class DeleteProduct {
    constructor(private repo: RepositoryPort<Product>, private cache: CachePort) {}

    async execute(id: string): Promise<void> {
        const product = await this.repo.findById(id);
        if (!product) {
            throw new NotFoundError("Produto não encontrado.");
        }
        product.softDelete();
        await this.repo.update(id, product);
        await this.cache.del(PRODUCTS_ALL_CACHE_KEY);
        await this.cache.del(productByIdCacheKey(id));
    }
}
