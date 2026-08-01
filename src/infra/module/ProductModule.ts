import { CachePort } from "../../domain/database/CachePort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { ProductController } from "../controller/ProductController";
import { DependencyInjection } from "../pattern/DI";
import { CategoryRepository } from "../repository/CategoryRepository";
import { ProductRepository } from "../repository/ProductRepository";
import { ProductRouter } from "../routers/ProductRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";

import { CreateProduct } from "../../app/products/useCase/CreateProduct";
import { DeleteProduct } from "../../app/products/useCase/DeleteProduct";
import { UpdateProduct } from "../../app/products/useCase/UpdateProduct";
import { GetProductById } from "../../app/products/useCase/GetProductById";
import { GetAllProducts } from "../../app/products/useCase/GetAllProducts";
import { createIdAdapter } from "../utils/createId";
import { ProductValidator } from "../validators/ProductValidator";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";

export class ProductModule {
    private server:ServerPort
    private db:DataAccessPort
    private cache:CachePort
    private productValidator: ProductValidator
    constructor(private di:DependencyInjection, private authRouter: UserAuthRouter) {
        const validator = this.di.getDependency<DTOBuilderAndValidator>(DTOBuilderAndValidator)
        this.productValidator = new ProductValidator(validator)
        this.db = this.di.getDependency(DataAccessPort)
        this.server = this.di.getDependency(ServerPort)
        this.cache = this.di.getDependency(CachePort)
        const productRepository = new ProductRepository(this.db)
        const categoryRepository = new CategoryRepository(this.db)
        const controller = new ProductController(
        new CreateProduct(productRepository,categoryRepository,this.cache,createIdAdapter),
        new DeleteProduct(productRepository,this.cache),
        new UpdateProduct(productRepository,categoryRepository,this.cache),
        new GetProductById(productRepository),
        new GetAllProducts(productRepository,this.cache),

        )
        new ProductRouter(this.server,controller,this.productValidator,this.authRouter)

    }
}