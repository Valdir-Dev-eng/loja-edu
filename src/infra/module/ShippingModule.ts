import { CalculateShipping } from "../../app/shipping/useCase/CalculateShipping";
import { CompleteMelhorEnvioConnection } from "../../app/shipping/useCase/CompleteMelhorEnvioConnection";
import { GetShippingLabelPrintLink } from "../../app/shipping/useCase/GetShippingLabelPrintLink";
import { PurchaseShippingLabel } from "../../app/shipping/useCase/PurchaseShippingLabel";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Address } from "../../domain/entites/Address";
import { Order } from "../../domain/entites/Order";
import { Product } from "../../domain/entites/Product";
import { User } from "../../domain/entites/User";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { ShippingGatewayPort } from "../../domain/shipping/ShippingGatewayPort";
import { MelhorEnvioController } from "../controller/MelhorEnvioController";
import { ShippingController } from "../controller/ShippingController";
import { ShippingLabelController } from "../controller/ShippingLabelController";
import { DependencyInjection } from "../pattern/DI";
import { AddressRepository } from "../repository/AddressRepository";
import { OrderRepository } from "../repository/OrderRepository";
import { ProductRepository } from "../repository/ProductRepository";
import { UserRepository } from "../repository/UserRepository";
import { MelhorEnvioRouter } from "../routers/MelhorEnvioRouter";
import { ShippingLabelRouter } from "../routers/ShippingLabelRouter";
import { ShippingRouter } from "../routers/ShippingRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";
import { ShippingValidator } from "../validators/ShippingValidator";

export class ShippingModule {
    constructor(private di: DependencyInjection, authRouter: UserAuthRouter) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);
        const shippingGateway = this.di.getDependency<ShippingGatewayPort>(ShippingGatewayPort);

        const productRepository: RepositoryPort<Product> = new ProductRepository(db);
        const addressRepository: RepositoryPort<Address> = new AddressRepository(db);
        const userRepository: RepositoryPort<User> = new UserRepository(db);
        const orderRepository: RepositoryPort<Order> = new OrderRepository(db);

        const shippingController = new ShippingController(new CalculateShipping(productRepository, shippingGateway));
        new ShippingRouter(server, shippingController, new ShippingValidator());

        const melhorEnvioController = new MelhorEnvioController(new CompleteMelhorEnvioConnection(shippingGateway));
        new MelhorEnvioRouter(server, melhorEnvioController, shippingGateway, authRouter);

        const shippingLabelController = new ShippingLabelController(
            new PurchaseShippingLabel(orderRepository, addressRepository, userRepository, productRepository, shippingGateway),
            new GetShippingLabelPrintLink(orderRepository, shippingGateway)
        );
        new ShippingLabelRouter(server, shippingLabelController, authRouter);
    }
}
