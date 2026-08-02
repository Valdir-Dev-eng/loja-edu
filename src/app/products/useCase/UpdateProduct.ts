import { CachePort } from "../../../domain/database/CachePort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { Category } from "../../../domain/entites/Category";
import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { ProductInput } from "../dto/ProductInput";
import { ProductOutput } from "../dto/ProductOutput";
import { PRODUCTS_ALL_CACHE_KEY, productByIdCacheKey } from "../ProductCacheKeys";

export class UpdateProduct {
    constructor(
        private repo: RepositoryPort<Product>,
        private categoryRepo: RepositoryPort<Category>,
        private cache: CachePort
    ) {}

    async execute(id: string, input: Partial<ProductInput>): Promise<ProductOutput> {
        const product = await this.repo.findById(id);
        if (!product) {
            throw new NotFoundError("Produto não encontrado.");
        }
        if (input.categoryId !== undefined && input.categoryId !== null) {
            await this.assertCategoryExists(input.categoryId);
        }

        product.updateFields(input);
        await this.repo.update(id, product);
        await this.cache.del(PRODUCTS_ALL_CACHE_KEY);
        await this.cache.del(productByIdCacheKey(id));

        return {
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
    }

    private async assertCategoryExists(categoryId: string): Promise<void> {
        const category = await this.categoryRepo.findById(categoryId);
        if (!category) {
            throw new NotFoundError("Categoria não encontrada.");
        }
    }
}
