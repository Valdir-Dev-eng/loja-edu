import { describe, expect, it } from "vitest";
import { MelhorEnvioResponseValidator } from "../../../src/infra/shipping/MelhorEnvioResponseValidator";

describe("MelhorEnvioResponseValidator", () => {
    describe("hasJsonContentType", () => {
        it("aceita content-type application/json puro", () => {
            expect(MelhorEnvioResponseValidator.hasJsonContentType("application/json")).toBe(true);
        });

        it("aceita content-type application/json com charset", () => {
            expect(MelhorEnvioResponseValidator.hasJsonContentType("application/json; charset=utf-8")).toBe(true);
        });

        it("recusa content-type text/html (painel devolvido em vez da API)", () => {
            expect(MelhorEnvioResponseValidator.hasJsonContentType("text/html; charset=UTF-8")).toBe(false);
        });

        it("recusa header ausente", () => {
            expect(MelhorEnvioResponseValidator.hasJsonContentType(null)).toBe(false);
        });
    });
});
