import { afterEach, describe, expect, it } from "vitest";
import { MelhorEnvioAdapter } from "../../../src/infra/shipping/MelhorEnvioAdapter";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { DataAccessPort } from "../../../src/domain/database/DataAcess";

class NullDataAccessPort extends DataAccessPort {
    async findMany<T extends object>(): Promise<T[]> {
        return [];
    }
    async findManyByField<T extends object>(): Promise<T[]> {
        return [];
    }
    async findOne<T extends object>(): Promise<T | undefined> {
        return undefined;
    }
    async create(): Promise<string | number | undefined> {
        return undefined;
    }
    async update(): Promise<number> {
        return 0;
    }
    async findBy<T extends object>(): Promise<T | null> {
        return null;
    }
    async remove(): Promise<number> {
        return 0;
    }
    async count(): Promise<number> {
        return 0;
    }
}

const MELHOR_ENVIO_ENV_KEYS = [
    "MELHOR_ENVIO_CLIENT_ID",
    "MELHOR_ENVIO_CLIENT_SECRET",
    "MELHOR_ENVIO_REDIRECT_URI",
    "MELHOR_ENVIO_USER_AGENT",
    "MELHOR_ENVIO_SANDBOX",
] as const;

describe("MelhorEnvioAdapter", () => {
    const originalValues = Object.fromEntries(MELHOR_ENVIO_ENV_KEYS.map((key) => [key, process.env[key]]));

    afterEach(() => {
        MELHOR_ENVIO_ENV_KEYS.forEach((key) => {
            if (originalValues[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = originalValues[key];
            }
        });
    });

    it("constrói sem lançar mesmo com a configuração do Melhor Envio totalmente ausente (leitura preguiçosa, nunca no boot)", () => {
        MELHOR_ENVIO_ENV_KEYS.forEach((key) => delete process.env[key]);

        expect(() => new MelhorEnvioAdapter(new NullDataAccessPort())).not.toThrow();
    });

    it("lança BusinessRuleError claro só quando um método de fato precisa da config, nunca no construtor", () => {
        MELHOR_ENVIO_ENV_KEYS.forEach((key) => delete process.env[key]);
        const adapter = new MelhorEnvioAdapter(new NullDataAccessPort());

        expect(() => adapter.buildAuthorizationUrl("state-qualquer", "https://loja.test/callback")).toThrow(
            BusinessRuleError
        );
        expect(() => adapter.buildAuthorizationUrl("state-qualquer", "https://loja.test/callback")).toThrow(
            "Configuração do Melhor Envio está incompleta. Contate o suporte."
        );
    });

    it("constrói a URL de autorização normalmente quando a configuração existe", () => {
        process.env.MELHOR_ENVIO_CLIENT_ID = "27365";
        process.env.MELHOR_ENVIO_CLIENT_SECRET = "segredo";
        process.env.MELHOR_ENVIO_REDIRECT_URI = "https://loja.test/callback/melhor/envio";
        process.env.MELHOR_ENVIO_USER_AGENT = "Loja (contato@loja.test)";
        process.env.MELHOR_ENVIO_SANDBOX = "true";
        const adapter = new MelhorEnvioAdapter(new NullDataAccessPort());

        const url = adapter.buildAuthorizationUrl("state-123", "https://loja.test/callback/melhor/envio");

        expect(url).toContain("https://sandbox.melhorenvio.com.br/oauth/authorize");
        expect(url).toContain("client_id=27365");
        expect(url).toContain("state=state-123");
    });
});
