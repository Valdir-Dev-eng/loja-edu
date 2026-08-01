import { NotFoundError } from "../../domain/errors/NotFoundError";
import { ConfigApp } from "../config/ConfigApp";
import { DevController } from "../controller/DevController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { SessionInjection, UserAuthRouter } from "./UserAuthRouter";

export class DevRouter {
    constructor(
        private server: ServerPort,
        private controller: DevController,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter("get", "/dev/promote-me", this.authRouter.requireSession, this.promoteMe);
    }

    private promoteMe: middleWare = async (req, res) => {
        try {
            if (!ConfigApp.isDevelopment()) {
                throw new NotFoundError("Não encontrado.");
            }
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            const result = await this.controller.promoteMe(authenticatedUser.id);
            res.status(200).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
