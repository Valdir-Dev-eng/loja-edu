import { afterEach, describe, expect, it } from "vitest";
import { ConfigMercadoPago } from "../../../src/infra/config/ConfigMercadoPago";

const ENV_KEYS = ["NODE_ENV", "MP_ACCESS_TOKEN_TEST", "MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET"] as const;

describe("ConfigMercadoPago", () => {
    const originalValues = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

    afterEach(() => {
        ENV_KEYS.forEach((key) => {
            if (originalValues[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = originalValues[key];
            }
        });
    });

    it("usa o token de teste quando NODE_ENV é development", () => {
        process.env.NODE_ENV = "development";
        process.env.MP_ACCESS_TOKEN_TEST = "APP_USR-token-de-sandbox";
        process.env.MP_WEBHOOK_SECRET = "webhook-secret";

        const secrets = ConfigMercadoPago.getSecrets();

        expect(secrets.accessToken).toBe("APP_USR-token-de-sandbox");
    });

    it("usa o token de produção fora do modo development", () => {
        process.env.NODE_ENV = "production";
        process.env.MP_ACCESS_TOKEN = "APP_USR-token-de-producao";
        process.env.MP_WEBHOOK_SECRET = "webhook-secret";

        const secrets = ConfigMercadoPago.getSecrets();

        expect(secrets.accessToken).toBe("APP_USR-token-de-producao");
    });

    it("recusa iniciar em development sem o token de teste configurado", () => {
        process.env.NODE_ENV = "development";
        delete process.env.MP_ACCESS_TOKEN_TEST;
        process.env.MP_WEBHOOK_SECRET = "webhook-secret";

        expect(() => ConfigMercadoPago.getSecrets()).toThrow();
    });

    it("recusa iniciar fora de development sem o token de produção configurado", () => {
        process.env.NODE_ENV = "production";
        delete process.env.MP_ACCESS_TOKEN;
        process.env.MP_WEBHOOK_SECRET = "webhook-secret";

        expect(() => ConfigMercadoPago.getSecrets()).toThrow();
    });

    it("mantém a mesma URL base da API em teste e em produção, pois o Mercado Pago não separa por host", () => {
        process.env.NODE_ENV = "development";
        process.env.MP_ACCESS_TOKEN_TEST = "APP_USR-token-de-sandbox";
        process.env.MP_WEBHOOK_SECRET = "webhook-secret";

        const secrets = ConfigMercadoPago.getSecrets();

        expect(secrets.baseUrl).toBe("https://api.mercadopago.com");
    });
});
