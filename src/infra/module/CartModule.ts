import { AddCartItem } from "../../app/cart/useCase/AddCartItem";
import { ListCart } from "../../app/cart/useCase/ListCart";
import { MergeCart } from "../../app/cart/useCase/MergeCart";
import { RemoveCartItem } from "../../app/cart/useCase/RemoveCartItem";
import { UpdateCartItemQuantity } from "../../app/cart/useCase/UpdateCartItemQuantity";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { CartItem } from "../../domain/entites/CartItem";
import { Product } from "../../domain/entites/Product";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { CartController } from "../controller/CartController";
import { DependencyInjection } from "../pattern/DI";
import { CartItemRepository } from "../repository/CartItemRepository";
import { ProductRepository } from "../repository/ProductRepository";
import { CartRouter } from "../routers/CartRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";
import { CartValidator } from "../validators/CartValidator";

export class CartModule {
    constructor(private di: DependencyInjection, authRouter: UserAuthRouter) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);

        const cartItemRepository: RepositoryPort<CartItem> = new CartItemRepository(db);
        const productRepository: RepositoryPort<Product> = new ProductRepository(db);

        const controller = new CartController(
            new ListCart(cartItemRepository, productRepository),
            new AddCartItem(cartItemRepository, productRepository, createIdAdapter),
            new UpdateCartItemQuantity(cartItemRepository, productRepository),
            new RemoveCartItem(cartItemRepository),
            new MergeCart(cartItemRepository, productRepository, createIdAdapter)
        );

        new CartRouter(server, controller, new CartValidator(), authRouter);
    }
}
