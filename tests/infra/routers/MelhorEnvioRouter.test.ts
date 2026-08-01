import { describe, expect, it } from "vitest";
import { MelhorEnvioRouter } from "../../../src/infra/routers/MelhorEnvioRouter";
import { UserAuthRouter } from "../../../src/infra/routers/UserAuthRouter";
import { FakeServerPort } from "../../doubles/FakeServerPort";
import { FakeOAuthProviderPort } from "../../doubles/FakeOAuthProviderPort";
import { FakeShippingGatewayPort } from "../../doubles/FakeShippingGatewayPort";

const buildRouter = () => {
    const server = new FakeServerPort();
    const authRouter = new UserAuthRouter(server, {} as any, new FakeOAuthProviderPort());
    const controller = { completeConnection: async () => {} };
    const shippingGateway = new FakeShippingGatewayPort();
    new MelhorEnvioRouter(server, controller as any, shippingGateway, authRouter);
    return { server, authRouter };
};

describe("MelhorEnvioRouter", () => {
    it("exige sessão e admin em GET /admin/melhor-envio/connect", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find(
            (r) => r.method === "get" && r.path === "/admin/melhor-envio/connect"
        );

        expect(route).toBeDefined();
        expect(route!.handlers[0]).toBe(authRouter.requireSession);
        expect(route!.handlers[1]).toBe(authRouter.requireAdmin);
    });

    it("GET /callback/melhor/envio é pública (protegida só pelo state, não por sessão)", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find((r) => r.method === "get" && r.path === "/callback/melhor/envio");

        expect(route).toBeDefined();
        expect(route!.handlers).not.toContain(authRouter.requireSession);
        expect(route!.handlers).not.toContain(authRouter.requireAdmin);
    });
});
