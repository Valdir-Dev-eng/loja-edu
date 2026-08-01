import { describe, expect, it } from "vitest";
import { MelhorEnvioCarrierRules } from "../../../src/infra/shipping/MelhorEnvioCarrierRules";

describe("MelhorEnvioCarrierRules", () => {
    describe("isPurchasableViaApi", () => {
        it("bloqueia Azul Cargo em produção", () => {
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("Azul Cargo Express", false)).toBe(false);
        });

        it("bloqueia Azul Cargo em sandbox também", () => {
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("Azul Cargo Express", true)).toBe(false);
        });

        it("bloqueia Jadlog em sandbox", () => {
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("Jadlog Package", true)).toBe(false);
        });

        it("permite Jadlog em produção", () => {
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("Jadlog Package", false)).toBe(true);
        });

        it("permite transportadoras normais em qualquer ambiente", () => {
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("PAC", false)).toBe(true);
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("SEDEX", true)).toBe(true);
        });

        it("não é sensível a maiúsculas/minúsculas ao identificar a transportadora", () => {
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("azul cargo express", false)).toBe(false);
            expect(MelhorEnvioCarrierRules.isPurchasableViaApi("JADLOG", true)).toBe(false);
        });
    });
});
