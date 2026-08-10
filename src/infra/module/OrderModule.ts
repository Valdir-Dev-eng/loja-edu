import { CheckoutOrder } from "../../app/orders/useCase/CheckoutOrder";
import { GetMyOrders } from "../../app/orders/useCase/GetMyOrders";
import { GetOrderPaymentStatus } from "../../app/orders/useCase/GetOrderPaymentStatus";
import { IssueRealtimeTicket } from "../../app/orders/useCase/IssueRealtimeTicket";
import { ListOrdersForAdmin } from "../../app/orders/useCase/ListOrdersForAdmin";
import { ProcessPaymentWebhook } from "../../app/orders/useCase/ProcessPaymentWebhook";
import { ClearCart } from "../../app/cart/useCase/ClearCart";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Address } from "../../domain/entites/Address";
import { Cart } from "../../domain/entites/Cart";
import { CartItem } from "../../domain/entites/CartItem";
import { Order } from "../../domain/entites/Order";
import { Product } from "../../domain/entites/Product";
import { User } from "../../domain/entites/User";
import { PaymentGatewayPort } from "../../domain/payment/PaymentGatewayPort";
import { WebSocketNotifierPort } from "../../domain/realtime/WebSocketNotifierPort";
import { ShippingGatewayPort } from "../../domain/shipping/ShippingGatewayPort";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { OrderController } from "../controller/OrderController";
import { DependencyInjection } from "../pattern/DI";
import { AddressRepository } from "../repository/AddressRepository";
import { CartItemRepository } from "../repository/CartItemRepository";
import { CartRepository } from "../repository/CartRepository";
import { OrderRepository } from "../repository/OrderRepository";
import { ProductRepository } from "../repository/ProductRepository";
import { UserRepository } from "../repository/UserRepository";
import { OrderRouter } from "../routers/OrderRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { WebhookRouter } from "../routers/WebhookRouter";
import { ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";
import { OrderValidator } from "../validators/OrderValidator";

export class OrderModule {
    public readonly controller: OrderController;

    constructor(private di: DependencyInjection, authRouter: UserAuthRouter) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);
        const paymentGateway = this.di.getDependency<PaymentGatewayPort>(PaymentGatewayPort);
        const shippingGateway = this.di.getDependency<ShippingGatewayPort>(ShippingGatewayPort);
        const wsNotifier = this.di.getDependency<WebSocketNotifierPort>(WebSocketNotifierPort);

        const orderRepository: RepositoryPort<Order> = new OrderRepository(db);
        const productRepository: RepositoryPort<Product> = new ProductRepository(db);
        const addressRepository: RepositoryPort<Address> = new AddressRepository(db);
        const userRepository: RepositoryPort<User> = new UserRepository(db);
        const cartRepository: RepositoryPort<Cart> = new CartRepository(db);
        const cartItemRepository: RepositoryPort<CartItem> = new CartItemRepository(db);

        const processPaymentWebhook = new ProcessPaymentWebhook(orderRepository, productRepository, paymentGateway, db, wsNotifier);

        this.controller = new OrderController(
            new CheckoutOrder(
                orderRepository,
                productRepository,
                addressRepository,
                userRepository,
                paymentGateway,
                shippingGateway,
                createIdAdapter,
                new ClearCart(cartRepository, cartItemRepository)
            ),
            processPaymentWebhook,
            new GetMyOrders(orderRepository),
            new GetOrderPaymentStatus(orderRepository, processPaymentWebhook),
            new ListOrdersForAdmin(orderRepository, userRepository),
            new IssueRealtimeTicket(wsNotifier)
        );

        new OrderRouter(server, this.controller, new OrderValidator(), authRouter);
        new WebhookRouter(server, this.controller, paymentGateway);
    }
}
