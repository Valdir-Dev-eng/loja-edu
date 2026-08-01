import { CachePort } from "../../../domain/database/CachePort";
import { Category } from "../../../domain/entites/Category";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { CategoryOutput } from "../dto/CategoryOutput";
import { CATEGORIES_ALL_CACHE_KEY, CATEGORIES_CACHE_TTL_SECONDS } from "../CategoryCacheKeys";

export class ListCategories {
    constructor(private repo: RepositoryPort<Category>, private cache: CachePort) {}

    async execute(): Promise<CategoryOutput[]> {
        const cached = await this.cache.get(CATEGORIES_ALL_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as CategoryOutput[];
        }

        const categories = await this.repo.findAll();
        const output = categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description,
        }));

        await this.cache.set(CATEGORIES_ALL_CACHE_KEY, JSON.stringify(output), CATEGORIES_CACHE_TTL_SECONDS);
        return output;
    }
}
