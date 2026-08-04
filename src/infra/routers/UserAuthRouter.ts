import { UserOutput } from "../../app/users/dto/UserOutput";
import { ForbiddenError } from "../../domain/errors/ForbiddenError";
import { OnboardingPendingError } from "../../domain/errors/OnboardingPendingError";
import { UnauthorizedError } from "../../domain/errors/UnauthorizedError";
import { OAuthProviderPort } from "../../domain/security/OAuthProviderPort";
import { UserAuthController } from "../controller/UserAuthController";
import { ConfigDomain } from "../config/ConfigDomain";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, IResponse, ServerPort, middleWare } from "../server/ServerPort";
import { createIdAdapter } from "../utils/createId";

export interface SessionInjection {
    authenticatedUser: UserOutput;
    sessionToken: string;
}

const OAUTH_STATE_COOKIE = "oauthState";
const OAUTH_REDIRECT_URI_COOKIE = "oauthRedirectUri";
const OAUTH_ORIGIN_COOKIE = "oauthOrigin";
const SESSION_COOKIE = "tokenUser";
const REFRESH_TOKEN_COOKIE = "refreshTokenUser";
const REFRESH_TOKEN_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;
const HARNESS_ROUTE_PREFIX = "/app";
const GOOGLE_CALLBACK_PATH = "/auth/google/callback";

type OAuthOrigin = "loja" | "admin";
const OAUTH_ORIGIN_ALLOWLIST: OAuthOrigin[] = ["loja", "admin"];

export class UserAuthRouter {
    constructor(
        private server: ServerPort,
        private controller: UserAuthController,
        private oauthProvider: OAuthProviderPort
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter("get", "/auth/google", this.redirectToGoogle);
        this.server.addRouter("get", "/auth/google/callback", this.handleGoogleCallback);
        this.server.addRouter("post", "/auth/refresh", this.refresh);
        this.server.addRouter("post", "/auth/logout", this.requireSession, this.logout);
        this.server.addRouter("get", "/auth/me", this.requireSession, this.me);
    }

    private setSessionCookie(res: IResponse, token: string) {
        res.cookie(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: ConfigDomain.secure,
            sameSite: "lax",
            maxAge: 3600000,
        });
    }

    private setRefreshCookie(res: IResponse, refreshToken: string) {
        res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
            httpOnly: true,
            secure: ConfigDomain.secure,
            sameSite: "lax",
            maxAge: REFRESH_TOKEN_MAX_AGE_MS,
        });
    }

    private buildRedirectUri(): string {
        // Fixo via config (nao pelo Host da requisicao): o proxy do Next.js
        // pro /auth/google faz uma chamada servidor-a-servidor direto no
        // Express, entao req.headers.host reflete quem o Next chamou, nao
        // o host que o navegador realmente esta usando. Confiar nisso fazia
        // o redirect_uri variar dependendo de como a rota era alcancada.
        return `${ConfigDomain.getDomain()}${GOOGLE_CALLBACK_PATH}`;
    }

    private resolveRequestedOrigin(req: IRequest): OAuthOrigin {
        const requested = (req.query as { origin?: string }).origin;
        return OAUTH_ORIGIN_ALLOWLIST.includes(requested as OAuthOrigin) ? (requested as OAuthOrigin) : "admin";
    }

    private redirectToGoogle: middleWare = async (req, res) => {
        const state = createIdAdapter();
        const redirectUri = this.buildRedirectUri();
        const origin = this.resolveRequestedOrigin(req);
        res.cookie(OAUTH_STATE_COOKIE, state, {
            httpOnly: true,
            secure: ConfigDomain.secure,
            sameSite: "lax",
            maxAge: 5 * 60 * 1000,
        });
        res.cookie(OAUTH_REDIRECT_URI_COOKIE, redirectUri, {
            httpOnly: true,
            secure: ConfigDomain.secure,
            sameSite: "lax",
            maxAge: 5 * 60 * 1000,
        });
        res.cookie(OAUTH_ORIGIN_COOKIE, origin, {
            httpOnly: true,
            secure: ConfigDomain.secure,
            sameSite: "lax",
            maxAge: 5 * 60 * 1000,
        });
        return res.status(302).json({ url: this.oauthProvider.buildAuthorizationUrl(state, redirectUri) });
    };

    private handleGoogleCallback: middleWare = async (req, res) => {
        try {
            const { code, state } = req.query as { code?: string; state?: string };
            const redirectUri = req.cookies[OAUTH_REDIRECT_URI_COOKIE];
            if (!code || !state || state !== req.cookies[OAUTH_STATE_COOKIE] || !redirectUri) {
                throw new UnauthorizedError("Autenticação com o Google inválida.");
            }
            const result = await this.controller.authenticateWithGoogleCode(code, redirectUri);
            const origin = req.cookies[OAUTH_ORIGIN_COOKIE] === "loja" ? "loja" : "admin";
            res.clearCookie(OAUTH_STATE_COOKIE);
            res.clearCookie(OAUTH_REDIRECT_URI_COOKIE);
            res.clearCookie(OAUTH_ORIGIN_COOKIE);
            this.setSessionCookie(res, result.token);
            this.setRefreshCookie(res, result.refreshToken);
            // "loja" e o novo frontend Next.js, que em dev vive numa origem
            // separada do Express — precisa de URL absoluta, nao caminho
            // relativo (senao o navegador fica na origem do Express).
            const target =
                origin === "loja"
                    ? `${ConfigDomain.getLojaOrigin()}/?onboardingPending=${result.onboardingPending}`
                    : `${HARNESS_ROUTE_PREFIX}/?onboardingPending=${result.onboardingPending}`;
            return res.redirect(target);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            return res.status(status).json(body);
        }
    };

    private refresh: middleWare = async (req, res) => {
        try {
            const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];
            const { accessToken } = await this.controller.refreshSession(refreshToken);
            this.setSessionCookie(res, accessToken);
            return res.status(200).json({ refreshed: true });
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            return res.status(status).json(body);
        }
    };

    public requireSession: middleWare = async (req, res, next) => {
        try {
            const token = req.cookies[SESSION_COOKIE];
            const authenticatedUser = await this.controller.resolveAuthenticatedUser(token);
            (req as IRequest<any, any, any, SessionInjection>).authenticatedUser = authenticatedUser;
            (req as IRequest<any, any, any, SessionInjection>).sessionToken = token;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    public requireAdmin: middleWare = async (req, res, next) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            if (!authenticatedUser.isAdmin) {
                throw new ForbiddenError("Ação permitida apenas para administradores.");
            }
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    public requireCompletedOnboarding: middleWare = async (req, res, next) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            if (!authenticatedUser.onboardingCompleted) {
                throw new OnboardingPendingError();
            }
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private me: middleWare = async (req, res) => {
        const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
        res.json(authenticatedUser);
    };

    private logout: middleWare = async (req, res) => {
        try {
            const { sessionToken } = req as IRequest<any, any, any, SessionInjection>;
            const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];
            await this.controller.logout(sessionToken, refreshToken);
            res.clearCookie(SESSION_COOKIE);
            res.clearCookie(REFRESH_TOKEN_COOKIE);
            return res.status(200).json({ message: "Sessão encerrada com sucesso." });
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            return res.status(status).json(body);
        }
    };
}
