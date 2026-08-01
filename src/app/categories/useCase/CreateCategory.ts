import { CachePort } from "../../../domain/database/CachePort";
import { Category } from "../../../domain/entites/Category";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { CategoryInput } from "../dto/CategoryInput";
import { CategoryOutput } from "../dto/CategoryOutput";
import { CATEGORIES_ALL_CACHE_KEY } from "../CategoryCacheKeys";

export class CreateCategory {
    constructor(private repo: RepositoryPort<Category>, private cache: CachePort, private createId: CreateId) {}

    async execute(input: CategoryInput): Promise<CategoryOutput> {
        const category = Category.build(this.createId, input.name, input.description);
        await this.repo.save(category);
        await this.cache.del(CATEGORIES_ALL_CACHE_KEY);

        return {
            id: category.id,
            name: category.name,
            description: category.description,
        };
    }
}
