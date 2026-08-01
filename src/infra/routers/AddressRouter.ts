import { AddressInput } from "../../app/users/dto/AddressInput";
import { AddressController } from "../controller/AddressController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { AddressValidator } from "../validators/AddressValidator";
import { SessionInjection, UserAuthRouter } from "./UserAuthRouter";

type AddressInjection = { addressInput: AddressInput };

export class AddressRouter {
    constructor(
        private server: ServerPort,
        private controller: AddressController,
        private validator: AddressValidator,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter("get", "/addresses/my", this.authRouter.requireSession, this.list);
        this.server.addRouter(
            "post",
            "/addresses",
            this.authRouter.requireSession,
            this.validateAddressInput,
            this.create
        );
        this.server.addRouter("delete", "/addresses/:id", this.authRouter.requireSession, this.remove);
    }

    private validateAddressInput: middleWare = async (req, res, next) => {
        try {
            const addressInput = this.validator.validateCreate(req.body);
            (req as IRequest<any, any, any, AddressInjection>).addressInput = addressInput;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private list: middleWare = async (req, res) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            const result = await this.controller.list(authenticatedUser.id);
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private create: middleWare = async (req, res) => {
        try {
            const { authenticatedUser, addressInput } = req as IRequest<
                any,
                any,
                any,
                SessionInjection & AddressInjection
            >;
            const result = await this.controller.create(authenticatedUser.id, addressInput);
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private remove: middleWare = async (req, res) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            const { id } = req.params;
            await this.controller.delete(authenticatedUser.id, id);
            res.status(204).send();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
