import { CategoryInput } from "../../app/categories/dto/CategoryInput";
import { CreateCategory } from "../../app/categories/useCase/CreateCategory";
import { ListCategories } from "../../app/categories/useCase/ListCategories";

export class CategoryController {
    constructor(private createCategory: CreateCategory, private listCategories: ListCategories) {}

    async create(input: CategoryInput) {
        return await this.createCategory.execute(input);
    }

    async list() {
        return await this.listCategories.execute();
    }
}
