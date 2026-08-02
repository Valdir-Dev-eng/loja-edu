import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "../../../src/domain/entites/User";
import { SessionInjection } from "../../../src/infra/routers/UserAuthRouter";
import { IRequest, IResponse } from "../../../src/infra/server/ServerPort";
import { buildAuthTestKit, buildReq, FakeResponse } from "../../doubles/AuthTestKit";

describe("UserAuthRouter — requireSession (autenticação real, sem stubs)", () => {
    let kit: ReturnType<typeof buildAuthTestKit>;

    beforeEach(() => {
        kit = buildAuthTestKit();
    });

    const invoke = async (req: IRequest) => {
        const res = new FakeResponse();
        let nextCalled = false;
        await kit.authRouter.requireSession(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });
        return { res, nextCalled };
    };

    it("recusa com 401 quando não há cookie de sessão", async () => {
        const { res, nextCalled } = await invoke(buildReq(undefined));

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
        expect((res.jsonBody as any).error).toBe("Sessão ausente.");
    });

    it("recusa com 401 quando o token é inválido/malformado", async () => {
        kit.tokenManager.failNextVerifyWith(new Error("jwt malformed"));

        const { res, nextCalled } = await invoke(buildReq("token-malformado"));

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
        expect((res.jsonBody as any).error).toBe("Sessão inválida. Faça login novamente.");
    });

    it("recusa com 401 quando o token está expirado", async () => {
        const expiredError = new Error("jwt expired");
        expiredError.name = "TokenExpiredError";
        kit.tokenManager.failNextVerifyWith(expiredError);

        const { res, nextCalled } = await invoke(buildReq("token-expirado"));

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
        expect((res.jsonBody as any).error).toBe("Sessão expirada. Faça login novamente.");
    });

    it("recusa com 401 um token válido que já foi revogado (logout)", async () => {
        const user = await kit.createUser(UserRole.CUSTOMER);
        const token = kit.tokenFor(user);
        await kit.serviceAuthToken.revoke(token);

        const { res, nextCalled } = await invoke(buildReq(token));

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
        expect((res.jsonBody as any).error).toBe("Token revogado.");
    });

    it("recusa com 401 quando o token aponta para um usuário que não existe mais", async () => {
        kit.tokenManager.setNextVerifiedPayload({ id: "id-que-nunca-existiu" });

        const { res, nextCalled } = await invoke(buildReq("token-usuario-inexistente"));

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
        expect((res.jsonBody as any).error).toBe("Sessão inválida.");
    });

    it("recusa com 401 quando o token aponta para um usuário desativado (soft delete)", async () => {
        const user = await kit.createUser(UserRole.CUSTOMER);
        user.softDelete();
        await kit.userRepo.save(user);
        const token = kit.tokenFor(user);

        const { res, nextCalled } = await invoke(buildReq(token));

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);
    });

    it("aceita um usuário comum válido, injeta authenticatedUser com isAdmin:false e chama next()", async () => {
        const user = await kit.createUser(UserRole.CUSTOMER);
        const token = kit.tokenFor(user);
        const req = buildReq(token);

        const { nextCalled } = await invoke(req);

        expect(nextCalled).toBe(true);
        const injected = (req as IRequest<any, any, any, SessionInjection>).authenticatedUser;
        expect(injected.id).toBe(user.id);
        expect(injected.isAdmin).toBe(false);
    });

    it("aceita um admin válido, injeta authenticatedUser com isAdmin:true e chama next()", async () => {
        const admin = await kit.createUser(UserRole.ADMIN);
        const token = kit.tokenFor(admin);
        const req = buildReq(token);

        const { nextCalled } = await invoke(req);

        expect(nextCalled).toBe(true);
        const injected = (req as IRequest<any, any, any, SessionInjection>).authenticatedUser;
        expect(injected.isAdmin).toBe(true);
    });
});

describe("UserAuthRouter — requireAdmin (autenticação real, sem stubs)", () => {
    let kit: ReturnType<typeof buildAuthTestKit>;

    beforeEach(() => {
        kit = buildAuthTestKit();
    });

    const invokeSessionThenAdmin = async (token: string | undefined) => {
        const req = buildReq(token);
        const res = new FakeResponse();
        await kit.authRouter.requireSession(req, res as unknown as IResponse, () => {});
        let adminNextCalled = false;
        await kit.authRouter.requireAdmin(req, res as unknown as IResponse, () => {
            adminNextCalled = true;
        });
        return { res, adminNextCalled };
    };

    it("um TOKEN DE USUÁRIO COMUM não passa em requireAdmin: recebe 403", async () => {
        const user = await kit.createUser(UserRole.CUSTOMER);
        const token = kit.tokenFor(user);

        const { res, adminNextCalled } = await invokeSessionThenAdmin(token);

        expect(adminNextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
        expect((res.jsonBody as any).error).toBe("Ação permitida apenas para administradores.");
    });

    it("um TOKEN DE ADMIN passa em requireAdmin normalmente", async () => {
        const admin = await kit.createUser(UserRole.ADMIN);
        const token = kit.tokenFor(admin);

        const { adminNextCalled } = await invokeSessionThenAdmin(token);

        expect(adminNextCalled).toBe(true);
    });

    it("comportamento hoje ao chamar requireAdmin sem requireSession antes (sem authenticatedUser no req): responde 500, não 401/403 — risco de uso indevido isolado", async () => {
        const req = buildReq("qualquer-token");
        const res = new FakeResponse();
        let nextCalled = false;

        await kit.authRouter.requireAdmin(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(500);
    });
});

describe("UserAuthRouter — requireCompletedOnboarding (autenticação real, sem stubs)", () => {
    let kit: ReturnType<typeof buildAuthTestKit>;

    beforeEach(() => {
        kit = buildAuthTestKit();
    });

    it("bloqueia com 403 e details.onboardingPending quando o onboarding não foi concluído", async () => {
        const user = await kit.createUser(UserRole.CUSTOMER, false);
        const token = kit.tokenFor(user);
        const req = buildReq(token);
        const res = new FakeResponse();
        await kit.authRouter.requireSession(req, res as unknown as IResponse, () => {});

        let nextCalled = false;
        await kit.authRouter.requireCompletedOnboarding(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(403);
        expect((res.jsonBody as any).details).toEqual({ onboardingPending: true });
    });

    it("libera quando o onboarding já foi concluído", async () => {
        const user = await kit.createUser(UserRole.CUSTOMER, true);
        const token = kit.tokenFor(user);
        const req = buildReq(token);
        const res = new FakeResponse();
        await kit.authRouter.requireSession(req, res as unknown as IResponse, () => {});

        let nextCalled = false;
        await kit.authRouter.requireCompletedOnboarding(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(true);
    });
});

describe("UserAuthRouter — logout revoga a sessão de verdade", () => {
    it("depois de fazer logout, o mesmo token deixa de passar em requireSession", async () => {
        const kit = buildAuthTestKit();
        const user = await kit.createUser(UserRole.CUSTOMER);
        const token = kit.tokenFor(user);
        const logoutReq = buildReq(token) as IRequest<any, any, any, SessionInjection>;
        const sessionRes = new FakeResponse();
        await kit.authRouter.requireSession(logoutReq, sessionRes as unknown as IResponse, () => {});

        const logoutRoute = kit.server.registeredRoutes.find((r) => r.method === "post" && r.path === "/auth/logout")!;
        const logoutHandler = logoutRoute.handlers[logoutRoute.handlers.length - 1];
        const logoutRes = new FakeResponse();
        await logoutHandler(logoutReq, logoutRes as unknown as IResponse, () => {});
        expect(logoutRes.statusCode).toBe(200);

        const secondReq = buildReq(token);
        const secondRes = new FakeResponse();
        let nextCalled = false;
        await kit.authRouter.requireSession(secondReq, secondRes as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(secondRes.statusCode).toBe(401);
        expect((secondRes.jsonBody as any).error).toBe("Token revogado.");
    });
});

describe("UserAuthRouter — GET /auth/google (entrada do login)", () => {
    let kit: ReturnType<typeof buildAuthTestKit>;

    beforeEach(() => {
        kit = buildAuthTestKit();
    });

    const findRedirectHandler = () =>
        kit.server.registeredRoutes.find((r) => r.method === "get" && r.path === "/auth/google")!.handlers[0];

    it("nunca faz um redirect de servidor: sempre responde 302 com JSON {url}, não um Location header", async () => {
        const handler = findRedirectHandler();
        const req = buildReq(undefined, { query: {} });
        const res = new FakeResponse();

        await handler(req, res as unknown as IResponse, () => {});

        expect(res.redirectedTo).toBeNull();
        expect(res.statusCode).toBe(302);
        expect((res.jsonBody as any).url).toEqual(expect.any(String));
    });

    it("não tem tratamento especial para quem já está logado: mesmo com um cookie de sessão válido presente, ainda devolve a URL do Google normalmente", async () => {
        const user = await kit.createUser(UserRole.CUSTOMER);
        const token = kit.tokenFor(user);
        const handler = findRedirectHandler();
        const req = buildReq(token, { query: {} });
        const res = new FakeResponse();

        await handler(req, res as unknown as IResponse, () => {});

        expect(res.statusCode).toBe(302);
        expect((res.jsonBody as any).url).toEqual(expect.any(String));
    });

    it("essa rota é pública: seus handlers não incluem requireSession nem requireAdmin", () => {
        const route = kit.server.registeredRoutes.find((r) => r.method === "get" && r.path === "/auth/google")!;

        expect(route.handlers).not.toContain(kit.authRouter.requireSession);
        expect(route.handlers).not.toContain(kit.authRouter.requireAdmin);
    });
});

describe("UserAuthRouter — GET /auth/google/callback", () => {
    let kit: ReturnType<typeof buildAuthTestKit>;

    beforeEach(() => {
        kit = buildAuthTestKit();
    });

    const findCallbackHandler = () =>
        kit.server.registeredRoutes.find((r) => r.method === "get" && r.path === "/auth/google/callback")!
            .handlers[0];

    it("recusa com 401 em JSON (não redireciona) quando o state não bate com o cookie", async () => {
        const handler = findCallbackHandler();
        const req = buildReq(undefined, {
            query: { code: "abc", state: "state-errado" },
            cookies: { oauthState: "state-certo", oauthRedirectUri: "https://x/auth/google/callback" },
        });
        const res = new FakeResponse();

        await handler(req, res as unknown as IResponse, () => {});

        expect(res.redirectedTo).toBeNull();
        expect(res.statusCode).toBe(401);
    });

    it("recusa com 401 em JSON quando falta o code", async () => {
        const handler = findCallbackHandler();
        const req = buildReq(undefined, {
            query: { state: "state-certo" },
            cookies: { oauthState: "state-certo", oauthRedirectUri: "https://x/auth/google/callback" },
        });
        const res = new FakeResponse();

        await handler(req, res as unknown as IResponse, () => {});

        expect(res.redirectedTo).toBeNull();
        expect(res.statusCode).toBe(401);
    });

    it("no sucesso, redireciona (não JSON) para '/' quando oauthOrigin é 'loja'", async () => {
        kit.oauthProvider.authorizeNextExchangeWithEmail("cliente@teste.com");
        const handler = findCallbackHandler();
        const req = buildReq(undefined, {
            query: { code: "codigo-valido", state: "state-certo" },
            cookies: {
                oauthState: "state-certo",
                oauthRedirectUri: "https://x/auth/google/callback",
                oauthOrigin: "loja",
            },
        });
        const res = new FakeResponse();

        await handler(req, res as unknown as IResponse, () => {});

        expect(res.redirectedTo).toMatch(/^\/\?onboardingPending=/);
        expect(res.jsonBody).toBeNull();
    });

    it("no sucesso, redireciona para '/app/' quando oauthOrigin não é 'loja' (padrão admin)", async () => {
        kit.oauthProvider.authorizeNextExchangeWithEmail("admin@teste.com");
        const handler = findCallbackHandler();
        const req = buildReq(undefined, {
            query: { code: "codigo-valido", state: "state-certo" },
            cookies: { oauthState: "state-certo", oauthRedirectUri: "https://x/auth/google/callback" },
        });
        const res = new FakeResponse();

        await handler(req, res as unknown as IResponse, () => {});

        expect(res.redirectedTo).toMatch(/^\/app\/\?onboardingPending=/);
    });

    it("no sucesso, define o cookie de sessão (tokenUser) e limpa os cookies temporários de OAuth", async () => {
        kit.oauthProvider.authorizeNextExchangeWithEmail("cliente2@teste.com");
        const handler = findCallbackHandler();
        const req = buildReq(undefined, {
            query: { code: "codigo-valido", state: "state-certo" },
            cookies: {
                oauthState: "state-certo",
                oauthRedirectUri: "https://x/auth/google/callback",
                oauthOrigin: "loja",
            },
        });
        const res = new FakeResponse();

        await handler(req, res as unknown as IResponse, () => {});

        expect(res.cookiesSet.tokenUser).toBeDefined();
        expect(res.cookiesSet.tokenUser.options?.httpOnly).toBe(true);
        expect(res.clearedCookies).toEqual(
            expect.arrayContaining(["oauthState", "oauthRedirectUri", "oauthOrigin"])
        );
    });

    it("essa rota é pública: seus handlers não incluem requireSession nem requireAdmin", () => {
        const route = kit.server.registeredRoutes.find(
            (r) => r.method === "get" && r.path === "/auth/google/callback"
        )!;

        expect(route.handlers).not.toContain(kit.authRouter.requireSession);
        expect(route.handlers).not.toContain(kit.authRouter.requireAdmin);
    });
});
