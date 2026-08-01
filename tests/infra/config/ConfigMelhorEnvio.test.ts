import { afterEach, describe, expect, it } from "vitest";
import { ConfigMelhorEnvio } from "../../../src/infra/config/ConfigMelhorEnvio";

const ENV_KEYS = [
    "MELHOR_ENVIO_SANDBOX",
    "MELHOR_ENVIO_CLIENT_ID",
    "MELHOR_ENVIO_CLIENT_SECRET",
    "MELHOR_ENVIO_REDIRECT_URI",
    "MELHOR_ENVIO_USER_AGENT",
] as const;

describe("ConfigMelhorEnvio", () => {
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

    const setBaseEnv = () => {
        process.env.MELHOR_ENVIO_CLIENT_ID = "27365";
        process.env.MELHOR_ENVIO_CLIENT_SECRET = "segredo";
        process.env.MELHOR_ENVIO_REDIRECT_URI = "https://exemplo.test/callback/melhor/envio";
        process.env.MELHOR_ENVIO_USER_AGENT = "Loja (contato@exemplo.test)";
    };

    it("usa a URL base de sandbox quando MELHOR_ENVIO_SANDBOX é true", () => {
        setBaseEnv();
        process.env.MELHOR_ENVIO_SANDBOX = "true";

        const secrets = ConfigMelhorEnvio.getSecrets();

        expect(secrets.baseUrl).toBe("https://sandbox.melhorenvio.com.br");
        expect(secrets.isSandbox).toBe(true);
    });

    it("usa a URL base de produção quando MELHOR_ENVIO_SANDBOX não é true", () => {
        setBaseEnv();
        process.env.MELHOR_ENVIO_SANDBOX = "false";

        const secrets = ConfigMelhorEnvio.getSecrets();

        expect(secrets.baseUrl).toBe("https://melhorenvio.com.br");
        expect(secrets.isSandbox).toBe(false);
    });

    it("recusa iniciar sem MELHOR_ENVIO_CLIENT_ID configurado", () => {
        setBaseEnv();
        process.env.MELHOR_ENVIO_SANDBOX = "true";
        delete process.env.MELHOR_ENVIO_CLIENT_ID;

        expect(() => ConfigMelhorEnvio.getSecrets()).toThrow();
    });
});
