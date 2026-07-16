import { CreateOrder } from "../../app/orders/useCase/CreateOrder";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Order } from "../../domain/entites/Order";
import { Product } from "../../domain/entites/Product";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { OrderController } from "../controller/OrderController";
import { DependencyInjection } from "../pattern/DI";
import { OrderRepository } from "../repository/OrderRepository";
import { ProductRepository } from "../repository/ProductRepository";
import { OrderRouter } from "../routers/OrderRouter";
import { ServiceAuthToken } from "../security/ServiceAuthToken";
import { ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";

export class OrderModule {
    constructor(private di:DependencyInjection, private service:ServiceAuthToken) {

        const data = this.di.getDependency<DataAccessPort>(DataAccessPort)
        const repo:RepositoryPort<Order> = new OrderRepository(data)
        const repoProduct:RepositoryPort<Product> = new ProductRepository(data)
        const orderController = new OrderController(new CreateOrder(repo,repoProduct, createIdAdapter))
        const server = this.di.getDependency<ServerPort>(ServerPort)
        new OrderRouter(server,this.service,orderController)
    }
    
}