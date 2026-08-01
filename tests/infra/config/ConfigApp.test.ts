import { afterEach, describe, expect, it } from "vitest";
import { ConfigApp } from "../../../src/infra/config/ConfigApp";

describe("ConfigApp", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
    });

    it("retorna true quando NODE_ENV é exatamente development", () => {
        process.env.NODE_ENV = "development";

        expect(ConfigApp.isDevelopment()).toBe(true);
    });

    it("retorna false quando NODE_ENV é production", () => {
        process.env.NODE_ENV = "production";

        expect(ConfigApp.isDevelopment()).toBe(false);
    });

    it("retorna false quando NODE_ENV tem qualquer outro valor", () => {
        process.env.NODE_ENV = "staging";

        expect(ConfigApp.isDevelopment()).toBe(false);
    });

    it("retorna false quando NODE_ENV está ausente, falhando fechado", () => {
        delete process.env.NODE_ENV;

        expect(ConfigApp.isDevelopment()).toBe(false);
    });
});
