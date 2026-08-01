import { describe, expect, it } from "vitest";
import { ShippingRouter } from "../../../src/infra/routers/ShippingRouter";
import { ShippingValidator } from "../../../src/infra/validators/ShippingValidator";
import { FakeServerPort } from "../../doubles/FakeServerPort";

describe("ShippingRouter", () => {
    it("POST /shipping/quote é pública, só com validação de entrada antes do handler", () => {
        const server = new FakeServerPort();
        const controller = { quote: async () => [] };
        new ShippingRouter(server, controller as any, new ShippingValidator());

        const route = server.registeredRoutes.find((r) => r.method === "post" && r.path === "/shipping/quote");

        expect(route).toBeDefined();
        expect(route!.handlers).toHaveLength(2);
    });
});
