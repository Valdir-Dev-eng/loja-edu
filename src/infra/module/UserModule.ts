import { CachePort } from "../../domain/database/CachePort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Address } from "../../domain/entites/Address";
import { User } from "../../domain/entites/User";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";
import { OAuthProviderPort } from "../../domain/security/OAuthProviderPort";
import { CreateAddress } from "../../app/addresses/useCase/CreateAddress";
import { DeleteAddress } from "../../app/addresses/useCase/DeleteAddress";
import { ListMyAddresses } from "../../app/addresses/useCase/ListMyAddresses";
import { AuthenticateWithGoogle } from "../../app/users/useCase/AuthenticateWithGoogle";
import { CompleteOnboarding } from "../../app/users/useCase/CompleteOnboarding";
import { GetAuthenticatedUser } from "../../app/users/useCase/GetAuthenticatedUser";
import { LogoutUser } from "../../app/users/useCase/LogoutUser";
import { AddressController } from "../controller/AddressController";
import { UserAuthController } from "../controller/UserAuthController";
import { DependencyInjection } from "../pattern/DI";
import { AddressRepository } from "../repository/AddressRepository";
import { UserRepository } from "../repository/UserRepository";
import { AddressRouter } from "../routers/AddressRouter";
import { OnboardingRouter } from "../routers/OnboardingRouter";
import { UserAuthRouter } from "../routers/UserAuthRouter";
import { ServiceAuthToken } from "../security/ServiceAuthToken";
import { ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";
import { AddressValidator } from "../validators/AddressValidator";
import { UserValidator } from "../validators/UserValidator";

export class UserModule {
    public readonly authRouter: UserAuthRouter;

    constructor(private di: DependencyInjection, serviceAuthToken: ServiceAuthToken) {
        const db = this.di.getDependency<DataAccessPort>(DataAccessPort);
        const server = this.di.getDependency<ServerPort>(ServerPort);
        const oauthProvider = this.di.getDependency<OAuthProviderPort>(OAuthProviderPort);
        const cache = this.di.getDependency<CachePort>(CachePort);

        const userRepository: RepositoryPort<User> = new UserRepository(db);
        const addressRepository: RepositoryPort<Address> = new AddressRepository(db);
        const validator = new UserValidator();

        const authController = new UserAuthController(
            new AuthenticateWithGoogle(oauthProvider, userRepository, createIdAdapter, serviceAuthToken),
            new CompleteOnboarding(userRepository, addressRepository, cache, createIdAdapter),
            new LogoutUser(serviceAuthToken),
            new GetAuthenticatedUser(serviceAuthToken, userRepository, cache)
        );

        const addressController = new AddressController(
            new ListMyAddresses(addressRepository),
            new CreateAddress(addressRepository, createIdAdapter),
            new DeleteAddress(addressRepository)
        );

        this.authRouter = new UserAuthRouter(server, authController, oauthProvider);
        new OnboardingRouter(server, authController, validator, this.authRouter);
        new AddressRouter(server, addressController, new AddressValidator(), this.authRouter);
    }
}
