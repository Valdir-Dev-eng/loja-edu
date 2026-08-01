import { CreateCategory } from "../../app/categories/useCase/CreateCategory";
import { ListCategories } from "../../app/categories/useCase/ListCategories";
import { CachePort } from "../../domain/database/CachePort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Category } from "../../domain/entites/Category";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { CategoryController } from "../controller/CategoryController";
import { DependencyInjection } from "../pattern/DI";
import { CategoryRepository } from "../repository/CategoryRepository";
import { CategoryRouter } from "../routers/CategoryRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";
import { CategoryValidator } from "../validators/CategoryValidator";

export class CategoryModule {
    public readonly controller: CategoryController;

    constructor(private di: DependencyInjection, authRouter: UserAuthRouter) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);
        const cache = this.di.getDependency<CachePort>(CachePort);

        const categoryRepository: RepositoryPort<Category> = new CategoryRepository(db);

        this.controller = new CategoryController(
            new CreateCategory(categoryRepository, cache, createIdAdapter),
            new ListCategories(categoryRepository, cache)
        );

        new CategoryRouter(server, this.controller, new CategoryValidator(), authRouter);
    }
}
