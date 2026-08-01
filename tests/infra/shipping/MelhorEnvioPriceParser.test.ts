import { describe, expect, it } from "vitest";
import { MelhorEnvioPriceParser } from "../../../src/infra/shipping/MelhorEnvioPriceParser";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";

describe("MelhorEnvioPriceParser", () => {
    describe("toCents", () => {
        it("converte um valor em string para centavos", () => {
            expect(MelhorEnvioPriceParser.toCents("37.79")).toBe(3779);
        });

        it("converte um valor numérico para centavos", () => {
            expect(MelhorEnvioPriceParser.toCents(37.79)).toBe(3779);
        });

        it("arredonda corretamente valores com imprecisão de ponto flutuante", () => {
            expect(MelhorEnvioPriceParser.toCents("10.1")).toBe(1010);
        });

        it("recusa string que não é um número válido", () => {
            expect(() => MelhorEnvioPriceParser.toCents("indisponível")).toThrow(BusinessRuleError);
            expect(() => MelhorEnvioPriceParser.toCents("indisponível")).toThrow(
                "Valor de frete retornado pelo Melhor Envio é inválido."
            );
        });

        it("recusa null", () => {
            expect(() => MelhorEnvioPriceParser.toCents(null)).toThrow(BusinessRuleError);
        });

        it("recusa undefined", () => {
            expect(() => MelhorEnvioPriceParser.toCents(undefined)).toThrow(BusinessRuleError);
        });

        it("recusa NaN/Infinity numérico", () => {
            expect(() => MelhorEnvioPriceParser.toCents(Number.NaN)).toThrow(BusinessRuleError);
            expect(() => MelhorEnvioPriceParser.toCents(Number.POSITIVE_INFINITY)).toThrow(BusinessRuleError);
        });
    });
});
