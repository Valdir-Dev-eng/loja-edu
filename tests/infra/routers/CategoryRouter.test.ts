import { describe, expect, it } from "vitest";
import { CategoryRouter } from "../../../src/infra/routers/CategoryRouter";
import { CategoryValidator } from "../../../src/infra/validators/CategoryValidator";
import { UserAuthRouter } from "../../../src/infra/routers/UserAuthRouter";
import { FakeServerPort } from "../../doubles/FakeServerPort";
import { FakeOAuthProviderPort } from "../../doubles/FakeOAuthProviderPort";

const buildRouter = () => {
    const server = new FakeServerPort();
    const authRouter = new UserAuthRouter(server, {} as any, new FakeOAuthProviderPort());
    const controller = { create: async () => ({}), list: async () => [] };
    new CategoryRouter(server, controller as any, new CategoryValidator(), authRouter);
    return { server, authRouter };
};

describe("CategoryRouter", () => {
    it("exige sessão e admin antes de validar e criar categoria em POST /categories", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find((r) => r.method === "post" && r.path === "/categories");

        expect(route).toBeDefined();
        expect(route!.handlers).toContain(authRouter.requireSession);
        expect(route!.handlers).toContain(authRouter.requireAdmin);
        expect(route!.handlers[0]).toBe(authRouter.requireSession);
        expect(route!.handlers[1]).toBe(authRouter.requireAdmin);
    });

    it("GET /categories é pública, sem requireSession nem requireAdmin", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find((r) => r.method === "get" && r.path === "/categories");

        expect(route).toBeDefined();
        expect(route!.handlers).not.toContain(authRouter.requireSession);
        expect(route!.handlers).not.toContain(authRouter.requireAdmin);
    });
});
