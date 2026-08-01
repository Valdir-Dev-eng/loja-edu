import { ListUsersForAdmin } from "../../app/users/useCase/ListUsersForAdmin";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { User } from "../../domain/entites/User";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { AdminController } from "../controller/AdminController";
import { OrderController } from "../controller/OrderController";
import { DependencyInjection } from "../pattern/DI";
import { UserRepository } from "../repository/UserRepository";
import { AdminRouter } from "../routers/AdminRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";

export class AdminModule {
    constructor(
        private di: DependencyInjection,
        authRouter: UserAuthRouter,
        orderController: OrderController
    ) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);
        const userRepository: RepositoryPort<User> = new UserRepository(db);

        const adminController = new AdminController(new ListUsersForAdmin(userRepository));

        new AdminRouter(server, orderController, adminController, authRouter);
    }
}
