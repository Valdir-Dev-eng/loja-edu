import { describe, expect, it } from "vitest";
import { UserAuthRouter } from "../../../src/infra/routers/UserAuthRouter";
import { FakeServerPort } from "../../doubles/FakeServerPort";
import { FakeOAuthProviderPort } from "../../doubles/FakeOAuthProviderPort";
import { IRequest, IResponse } from "../../../src/infra/server/ServerPort";

class FakeResponse {
    public statusCode: number | null = null;
    public jsonBody: unknown = null;

    status(status: number): IResponse {
        this.statusCode = status;
        return this as unknown as IResponse;
    }

    json(body: unknown): IResponse {
        this.jsonBody = body;
        return this as unknown as IResponse;
    }
}

const authenticatedUser = {
    id: "user-1",
    email: "joao@gmail.com",
    username: "joao",
    fullName: "João da Silva",
    onboardingCompleted: true,
    isAdmin: false,
};

const buildRouter = () => {
    const server = new FakeServerPort();
    const controller = { resolveAuthenticatedUser: async () => authenticatedUser };
    const router = new UserAuthRouter(server, controller as any, new FakeOAuthProviderPort());
    return { server, router };
};

describe("UserAuthRouter", () => {
    it("registra GET /auth/me atrás de requireSession", () => {
        const { server, router } = buildRouter();

        const route = server.registeredRoutes.find((r) => r.method === "get" && r.path === "/auth/me");

        expect(route).toBeDefined();
        expect(route!.handlers[0]).toBe(router.requireSession);
    });

    it("devolve o usuário autenticado injetado pelo requireSession, sem reformatar", async () => {
        const { server, router } = buildRouter();
        const route = server.registeredRoutes.find((r) => r.method === "get" && r.path === "/auth/me")!;
        const meHandler = route.handlers[route.handlers.length - 1];
        const req = { cookies: { tokenUser: "token-valido" } } as unknown as IRequest;
        const res = new FakeResponse();
        let nextCalled = false;

        await router.requireSession(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });
        expect(nextCalled).toBe(true);

        await meHandler(req, res as unknown as IResponse, () => {});

        expect(res.jsonBody).toEqual(authenticatedUser);
    });
});
