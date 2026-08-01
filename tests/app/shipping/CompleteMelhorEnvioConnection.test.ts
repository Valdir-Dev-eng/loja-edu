import { describe, expect, it } from "vitest";
import { CompleteMelhorEnvioConnection } from "../../../src/app/shipping/useCase/CompleteMelhorEnvioConnection";
import { FakeShippingGatewayPort } from "../../doubles/FakeShippingGatewayPort";

describe("CompleteMelhorEnvioConnection", () => {
    it("repassa o código e o redirectUri para o gateway completar a conexão", async () => {
        const shippingGateway = new FakeShippingGatewayPort();
        const useCase = new CompleteMelhorEnvioConnection(shippingGateway);

        await useCase.execute({ code: "codigo-oauth", redirectUri: "https://loja.test/callback/melhor/envio" });

        expect(shippingGateway.lastCompletedCode).toBe("codigo-oauth");
        expect(await shippingGateway.isConnected()).toBe(true);
    });
});
