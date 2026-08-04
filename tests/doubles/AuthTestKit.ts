import { AuthenticateWithGoogle } from "../../src/app/users/useCase/AuthenticateWithGoogle";
import { CompleteOnboarding } from "../../src/app/users/useCase/CompleteOnboarding";
import { GetAuthenticatedUser } from "../../src/app/users/useCase/GetAuthenticatedUser";
import { LogoutUser } from "../../src/app/users/useCase/LogoutUser";
import { RefreshSession } from "../../src/app/users/useCase/RefreshSession";
import { CachePort } from "../../src/domain/database/CachePort";
import { Address } from "../../src/domain/entites/Address";
import { User, UserRole } from "../../src/domain/entites/User";
import { AuthTokenManager } from "../../src/infra/security/AuthTokenManager";
import { ServiceAuthToken } from "../../src/infra/security/ServiceAuthToken";
import { DependencyInjection } from "../../src/infra/pattern/DI";
import { UserAuthController } from "../../src/infra/controller/UserAuthController";
import { UserAuthRouter } from "../../src/infra/routers/UserAuthRouter";
import { ICookieOptions, IRequest, IResponse, middleWare } from "../../src/infra/server/ServerPort";
import { createIdAdapter } from "../../src/infra/utils/createId";
import { FakeAuthTokenManager } from "./FakeAuthTokenManager";
import { FakeCachePort } from "./FakeCachePort";
import { FakeOAuthProviderPort } from "./FakeOAuthProviderPort";
import { FakeServerPort } from "./FakeServerPort";
import { InMemoryRepository } from "./InMemoryRepository";

/**
 * Builds a real UserAuthRouter (requireSession/requireAdmin/requireCompletedOnboarding
 * backed by the real use-case stack, not stubs) so authorization tests exercise the
 * genuine JWT/session/role logic instead of a stand-in.
 */
export function buildAuthTestKit() {
    const userRepo = new InMemoryRepository<User>();
    const addressRepo = new InMemoryRepository<Address>();
    const cache = new FakeCachePort();
    const tokenManager = new FakeAuthTokenManager();

    const di = new DependencyInjection();
    di.addDependency(cache, CachePort);
    di.addDependency(tokenManager, AuthTokenManager);
    const serviceAuthToken = new ServiceAuthToken(di);

    const getAuthenticatedUser = new GetAuthenticatedUser(serviceAuthToken, userRepo, cache);
    const logoutUser = new LogoutUser(serviceAuthToken);
    const oauthProvider = new FakeOAuthProviderPort();
    const authenticateWithGoogle = new AuthenticateWithGoogle(oauthProvider, userRepo, createIdAdapter, serviceAuthToken);
    const completeOnboarding = new CompleteOnboarding(userRepo, addressRepo, cache, createIdAdapter);
    const refreshSession = new RefreshSession(serviceAuthToken, userRepo);

    const controller = new UserAuthController(
        authenticateWithGoogle,
        completeOnboarding,
        logoutUser,
        getAuthenticatedUser,
        refreshSession
    );
    const server = new FakeServerPort();
    const authRouter = new UserAuthRouter(server, controller, oauthProvider);

    let sequence = 0;

    const createUser = async (role: UserRole = UserRole.CUSTOMER, onboarded = true): Promise<User> => {
        sequence++;
        const user = User.build(createIdAdapter, `user${sequence}@teste.com`, `user${sequence}`);
        if (role === UserRole.ADMIN) {
            user.promoteToAdmin();
        }
        if (onboarded) {
            user.completeOnboarding("Nome Teste", 1, "12345678901");
        }
        await userRepo.save(user);
        return user;
    };

    /** Mints a token string that will decode to `user` the next time requireSession runs. */
    const tokenFor = (user: User): string => {
        tokenManager.setNextVerifiedPayload({ id: user.id });
        return `token-${user.id}`;
    };

    /** Mints a refresh token string that will decode to `user` the next time it is verified. */
    const refreshTokenFor = (user: User): string => {
        tokenManager.setNextVerifiedPayload({ id: user.id });
        return `refresh-token-${user.id}`;
    };

    return {
        server,
        authRouter,
        oauthProvider,
        userRepo,
        addressRepo,
        cache,
        tokenManager,
        serviceAuthToken,
        createUser,
        tokenFor,
        refreshTokenFor,
    };
}

export class FakeResponse implements IResponse {
    public statusCode = 200;
    public jsonBody: unknown = null;
    public sentBody: string | undefined;
    public redirectedTo: string | null = null;
    public cookiesSet: Record<string, { value: string; options?: ICookieOptions }> = {};
    public clearedCookies: string[] = [];

    status(status: number): IResponse {
        this.statusCode = status;
        return this;
    }

    json(body: unknown): IResponse {
        this.jsonBody = body;
        return this;
    }

    send(message?: string): IResponse {
        this.sentBody = message;
        return this;
    }

    cookie(name: string, val: string, options?: ICookieOptions): IResponse {
        this.cookiesSet[name] = { value: val, options };
        return this;
    }

    clearCookie(name: string): IResponse {
        this.clearedCookies.push(name);
        return this;
    }

    redirect(url: string): unknown {
        this.redirectedTo = url;
        return this;
    }
}

export function buildReq(token?: string, overrides: Partial<IRequest> = {}): IRequest {
    return {
        body: {},
        params: {},
        query: {},
        cookies: token ? { tokenUser: token } : {},
        headers: { host: "localhost:9090" },
        protocol: "https",
        path: "/",
        method: "GET",
        ip: "127.0.0.1",
        ...overrides,
    } as IRequest;
}

/**
 * Executes a real Express-style middleware chain (as registered via FakeServerPort)
 * against a single shared FakeResponse, honoring the same next()-driven control flow
 * the real ServerExpressAdapter would use. Stops as soon as a middleware in the chain
 * does not call next() (i.e. it already wrote a response, like a 401/403 rejection or
 * the terminal business handler).
 */
export async function runChain(handlers: middleWare[], req: IRequest): Promise<FakeResponse> {
    const res = new FakeResponse();
    await new Promise<void>((resolve) => {
        let index = -1;
        const dispatch = (): void => {
            index++;
            if (index >= handlers.length) {
                resolve();
                return;
            }
            const current = handlers[index];
            let nextInvoked = false;
            const next = () => {
                nextInvoked = true;
                dispatch();
            };
            Promise.resolve(current(req, res as unknown as IResponse, next)).then(() => {
                if (!nextInvoked) {
                    resolve();
                }
            });
        };
        dispatch();
    });
    return res;
}
