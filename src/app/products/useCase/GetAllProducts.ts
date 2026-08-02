import { CachePort } from "../../../domain/database/CachePort";
import { Product } from "../../../domain/entites/Product";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { SingleFlight } from "../../../infra/cache/SingleFlight";
import { ProductOutput } from "../dto/ProductOutput";
import { PRODUCTS_ALL_CACHE_KEY, PRODUCTS_CACHE_TTL_SECONDS } from "../ProductCacheKeys";

export class GetAllProducts {
    constructor(private repo: RepositoryPort<Product>, private cache: CachePort, private singleFlight: SingleFlight) {}

    async execute(): Promise<ProductOutput[]> {
        const cached = await this.cache.get(PRODUCTS_ALL_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as ProductOutput[];
        }

        return this.singleFlight.run(PRODUCTS_ALL_CACHE_KEY, () => this.fetchAndCache());
    }

    private async fetchAndCache(): Promise<ProductOutput[]> {
        const products = await this.repo.findAll();
        const output = products.map((product) => ({
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
        }));

        await this.cache.set(PRODUCTS_ALL_CACHE_KEY, JSON.stringify(output), PRODUCTS_CACHE_TTL_SECONDS);
        return output;
    }
}
