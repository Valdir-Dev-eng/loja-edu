import { UnauthorizedError } from "../../domain/errors/UnauthorizedError";
import { ShippingGatewayPort } from "../../domain/shipping/ShippingGatewayPort";
import { MelhorEnvioController } from "../controller/MelhorEnvioController";
import { ConfigDomain } from "../config/ConfigDomain";
import { ConfigMelhorEnvio } from "../config/ConfigMelhorEnvio";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { middleWare, ServerPort } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";
import { UserAuthRouter } from "./UserAuthRouter";

const MELHOR_ENVIO_STATE_COOKIE = "melhorEnvioOauthState";

export class MelhorEnvioRouter {
    constructor(
        private server: ServerPort,
        private controller: MelhorEnvioController,
        private shippingGateway: ShippingGatewayPort,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "get",
            "/admin/melhor-envio/connect",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.redirectToMelhorEnvio
        );
        this.server.addRouter("get", "/callback/melhor/envio", this.handleCallback);
    }

    private redirectToMelhorEnvio: middleWare = async (req, res) => {
        const state = createIdAdapter();
        res.cookie(MELHOR_ENVIO_STATE_COOKIE, state, {
            httpOnly: true,
            secure: ConfigDomain.secure,
            sameSite: "lax",
            maxAge: 5 * 60 * 1000,
        });
        const redirectUri = ConfigMelhorEnvio.getSecrets().redirectUri;
        const url = this.shippingGateway.buildAuthorizationUrl(state, redirectUri);
        res.status(302).json({ url });
    };

    private handleCallback: middleWare = async (req, res) => {
        try {
            const { code, state } = req.query as { code?: string; state?: string };
            if (!code || !state || state !== req.cookies[MELHOR_ENVIO_STATE_COOKIE]) {
                throw new UnauthorizedError("Autorização do Melhor Envio inválida.");
            }
            const redirectUri = ConfigMelhorEnvio.getSecrets().redirectUri;
            await this.controller.completeConnection(code, redirectUri);
            res.clearCookie(MELHOR_ENVIO_STATE_COOKIE);
            res.status(200).json({ connected: true });
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
