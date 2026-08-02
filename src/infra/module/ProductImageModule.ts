import { DeleteProductImage } from "../../app/productImages/useCase/DeleteProductImage";
import { ListProductImages } from "../../app/productImages/useCase/ListProductImages";
import { UploadProductImage } from "../../app/productImages/useCase/UploadProductImage";
import { CachePort } from "../../domain/database/CachePort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Product } from "../../domain/entites/Product";
import { ProductImage } from "../../domain/entites/ProductImage";
import { ImageStorageGatewayPort } from "../../domain/image/ImageStorageGatewayPort";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { ProductImageController } from "../controller/ProductImageController";
import { DependencyInjection } from "../pattern/DI";
import { ProductImageRepository } from "../repository/ProductImageRepository";
import { ProductRepository } from "../repository/ProductRepository";
import { ProductImageRouter } from "../routers/ProductImageRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";

export class ProductImageModule {
    public readonly controller: ProductImageController;

    constructor(private di: DependencyInjection, authRouter: UserAuthRouter) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);
        const imageStorage = this.di.getDependency<ImageStorageGatewayPort>(ImageStorageGatewayPort);
        const cache = this.di.getDependency<CachePort>(CachePort);

        const productRepository: RepositoryPort<Product> = new ProductRepository(db);
        const imageRepository: RepositoryPort<ProductImage> = new ProductImageRepository(db);

        this.controller = new ProductImageController(
            new UploadProductImage(productRepository, imageRepository, imageStorage, cache, createIdAdapter),
            new DeleteProductImage(imageRepository, imageStorage, cache),
            new ListProductImages(imageRepository, cache)
        );

        new ProductImageRouter(server, this.controller, authRouter);
    }
}
