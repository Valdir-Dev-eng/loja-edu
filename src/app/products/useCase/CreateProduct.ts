import { CachePort } from "../../../domain/database/CachePort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { Category } from "../../../domain/entites/Category";
import { Product } from "../../../domain/entites/Product";
import { ConflictError } from "../../../domain/errors/ConflictError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { ProductInput } from "../dto/ProductInput";
import { ProductOutput } from "../dto/ProductOutput";
import { PRODUCTS_ALL_CACHE_KEY } from "../ProductCacheKeys";

export class CreateProduct {
    constructor(
        private repo: RepositoryPort<Product>,
        private categoryRepo: RepositoryPort<Category>,
        private cache: CachePort,
        private createId: () => string
    ) {}

    async execute(input: ProductInput): Promise<ProductOutput> {
        const alreadyExists = await this.repo.exists({ name: input.name });
        if (alreadyExists) {
            throw new ConflictError("Produto já cadastrado.");
        }
        if (input.categoryId) {
            await this.assertCategoryExists(input.categoryId);
        }

        const product = Product.build(
            this.createId,
            input.name,
            input.priceCents,
            input.discountCents,
            input.stock,
            input.weight,
            input.width,
            input.height,
            input.length,
            input.categoryId
        );
        await this.repo.save(product);
        await this.cache.del(PRODUCTS_ALL_CACHE_KEY);

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
