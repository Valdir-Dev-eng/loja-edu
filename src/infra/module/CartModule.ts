import { AddCartItem } from "../../app/cart/useCase/AddCartItem";
import { AttachCartToUser } from "../../app/cart/useCase/AttachCartToUser";
import { ListCart } from "../../app/cart/useCase/ListCart";
import { RemoveCartItem } from "../../app/cart/useCase/RemoveCartItem";
import { ResolveCart } from "../../app/cart/useCase/ResolveCart";
import { UpdateCartItemQuantity } from "../../app/cart/useCase/UpdateCartItemQuantity";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Cart } from "../../domain/entites/Cart";
import { CartItem } from "../../domain/entites/CartItem";
import { Product } from "../../domain/entites/Product";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { CartController } from "../controller/CartController";
import { DependencyInjection } from "../pattern/DI";
import { CartItemRepository } from "../repository/CartItemRepository";
import { CartRepository } from "../repository/CartRepository";
import { ProductRepository } from "../repository/ProductRepository";
import { CartRouter } from "../routers/CartRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";
import { CartValidator } from "../validators/CartValidator";

export class CartModule {
    public readonly controller: CartController;

    constructor(private di: DependencyInjection, authRouter: UserAuthRouter) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);

        const cartRepository: RepositoryPort<Cart> = new CartRepository(db);
        const cartItemRepository: RepositoryPort<CartItem> = new CartItemRepository(db);
        const productRepository: RepositoryPort<Product> = new ProductRepository(db);

        this.controller = new CartController(
            new ResolveCart(cartRepository, createIdAdapter),
            new ListCart(cartItemRepository, productRepository),
            new AddCartItem(cartItemRepository, productRepository, createIdAdapter),
            new UpdateCartItemQuantity(cartItemRepository, productRepository),
            new RemoveCartItem(cartItemRepository),
            new AttachCartToUser(cartRepository, cartItemRepository, productRepository, createIdAdapter)
        );

        new CartRouter(server, this.controller, new CartValidator(), authRouter);
    }
}
