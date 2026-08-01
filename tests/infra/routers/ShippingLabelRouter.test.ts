import { describe, expect, it } from "vitest";
import { ShippingLabelRouter } from "../../../src/infra/routers/ShippingLabelRouter";
import { UserAuthRouter } from "../../../src/infra/routers/UserAuthRouter";
import { FakeServerPort } from "../../doubles/FakeServerPort";
import { FakeOAuthProviderPort } from "../../doubles/FakeOAuthProviderPort";

const buildRouter = () => {
    const server = new FakeServerPort();
    const authRouter = new UserAuthRouter(server, {} as any, new FakeOAuthProviderPort());
    const controller = { purchase: async () => ({}), getPrintLink: async () => ({ url: "" }) };
    new ShippingLabelRouter(server, controller as any, authRouter);
    return { server, authRouter };
};

describe("ShippingLabelRouter", () => {
    it("exige sessão e admin em POST /admin/orders/:id/purchase-label", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find(
            (r) => r.method === "post" && r.path === "/admin/orders/:id/purchase-label"
        );

        expect(route).toBeDefined();
        expect(route!.handlers[0]).toBe(authRouter.requireSession);
        expect(route!.handlers[1]).toBe(authRouter.requireAdmin);
    });

    it("exige sessão e admin em GET /admin/orders/:id/label-print-link", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find(
            (r) => r.method === "get" && r.path === "/admin/orders/:id/label-print-link"
        );

        expect(route).toBeDefined();
        expect(route!.handlers[0]).toBe(authRouter.requireSession);
        expect(route!.handlers[1]).toBe(authRouter.requireAdmin);
    });
});
