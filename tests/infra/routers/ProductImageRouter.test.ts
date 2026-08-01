import { describe, expect, it } from "vitest";
import { ProductImageRouter } from "../../../src/infra/routers/ProductImageRouter";
import { UserAuthRouter } from "../../../src/infra/routers/UserAuthRouter";
import { FakeServerPort } from "../../doubles/FakeServerPort";
import { FakeOAuthProviderPort } from "../../doubles/FakeOAuthProviderPort";

const buildRouter = () => {
    const server = new FakeServerPort();
    const authRouter = new UserAuthRouter(server, {} as any, new FakeOAuthProviderPort());
    const controller = { upload: async () => ({}), delete: async () => {}, list: async () => [] };
    new ProductImageRouter(server, controller as any, authRouter);
    return { server, authRouter };
};

describe("ProductImageRouter", () => {
    it("exige sessão e admin em POST /admin/products/:id/images, antes do upload", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find(
            (r) => r.method === "post" && r.path === "/admin/products/:id/images"
        );

        expect(route).toBeDefined();
        expect(route!.handlers[0]).toBe(authRouter.requireSession);
        expect(route!.handlers[1]).toBe(authRouter.requireAdmin);
    });

    it("exige sessão e admin em DELETE /admin/products/:id/images/:imageId", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find(
            (r) => r.method === "delete" && r.path === "/admin/products/:id/images/:imageId"
        );

        expect(route).toBeDefined();
        expect(route!.handlers).toContain(authRouter.requireSession);
        expect(route!.handlers).toContain(authRouter.requireAdmin);
    });

    it("GET /product/:id/images é pública, sem requireSession nem requireAdmin", () => {
        const { server, authRouter } = buildRouter();

        const route = server.registeredRoutes.find((r) => r.method === "get" && r.path === "/product/:id/images");

        expect(route).toBeDefined();
        expect(route!.handlers).not.toContain(authRouter.requireSession);
        expect(route!.handlers).not.toContain(authRouter.requireAdmin);
    });
});
