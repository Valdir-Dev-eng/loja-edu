import { DataAccessPort } from "../../domain/database/DataAcess";
import { Product } from "../../domain/entites/Product";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { ProductController } from "../controller/ProductController";
import { DependencyInjection } from "../pattern/DI";
import { ProductRepository } from "../repository/ProductRepository";
import { ProductRouter } from "../routers/ProductRouter";
import { ProductInput } from "../schema/ProductSchema";
import { ServerPort } from "../server/ServerPort";
import { Validator } from "../validators/Validator";

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
    private productValidator: Validator<ProductInput>
    constructor(private di:DependencyInjection) {
        const validator = this.di.getDependency<DTOBuilderAndValidator>(DTOBuilderAndValidator)        
        this.productValidator = new ProductValidator(validator)
        this.db = this.di.getDependency(DataAccessPort)
        this.server = this.di.getDependency(ServerPort)
        const productRepository = new ProductRepository(this.db)
        const controller = new ProductController(
        new CreateProduct(productRepository,createIdAdapter),
        new DeleteProduct(productRepository),
        new UpdateProduct(productRepository),
        new GetProductById(productRepository),
        new GetAllProducts(productRepository),

        )
        new ProductRouter(this.server,controller,this.productValidator)

    }
}