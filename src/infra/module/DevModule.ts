import { PromoteUserToAdmin } from "../../app/users/useCase/PromoteUserToAdmin";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { User } from "../../domain/entites/User";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DevController } from "../controller/DevController";
import { DependencyInjection } from "../pattern/DI";
import { UserRepository } from "../repository/UserRepository";
import { DevRouter } from "../routers/DevRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServerPort } from "../server/ServerPort";

export class DevModule {
    constructor(private di: DependencyInjection, authRouter: UserAuthRouter) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);
        const userRepository: RepositoryPort<User> = new UserRepository(db);
        const controller = new DevController(new PromoteUserToAdmin(userRepository));
        new DevRouter(server, controller, authRouter);
    }
}
