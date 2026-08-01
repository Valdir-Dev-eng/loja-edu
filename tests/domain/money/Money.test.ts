import { describe, expect, it } from "vitest";
import { Money } from "../../../src/domain/money/Money";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";

describe("Money", () => {
    describe("fromDecimalString", () => {
        it("converte string com duas casas decimais para centavos", () => {
            expect(Money.fromDecimalString("19.90")).toBe(1990);
        });

        it("converte string com uma casa decimal completando com zero", () => {
            expect(Money.fromDecimalString("19.9")).toBe(1990);
        });

        it("converte string sem parte decimal", () => {
            expect(Money.fromDecimalString("19")).toBe(1900);
        });

        it("converte string negativa preservando o sinal", () => {
            expect(Money.fromDecimalString("-10.50")).toBe(-1050);
        });

        it("recusa string com mais de duas casas decimais", () => {
            expect(() => Money.fromDecimalString("19.999")).toThrow(BusinessRuleError);
            expect(() => Money.fromDecimalString("19.999")).toThrow("Valor monetário inválido.");
        });

        it("recusa string não numérica", () => {
            expect(() => Money.fromDecimalString("abc")).toThrow(BusinessRuleError);
            expect(() => Money.fromDecimalString("abc")).toThrow("Valor monetário inválido.");
        });
    });

    describe("fromDecimalNumber", () => {
        it("converte número decimal para centavos arredondando", () => {
            expect(Money.fromDecimalNumber(19.9)).toBe(1990);
        });

        it("recusa número não finito", () => {
            expect(() => Money.fromDecimalNumber(Number.NaN)).toThrow(BusinessRuleError);
            expect(() => Money.fromDecimalNumber(Number.POSITIVE_INFINITY)).toThrow(BusinessRuleError);
        });
    });

    describe("toDecimalString", () => {
        it("converte centavos para string decimal com duas casas", () => {
            expect(Money.toDecimalString(1990)).toBe("19.90");
        });

        it("preserva zeros à esquerda na parte decimal", () => {
            expect(Money.toDecimalString(1905)).toBe("19.05");
        });

        it("converte centavos negativos preservando o sinal", () => {
            expect(Money.toDecimalString(-1050)).toBe("-10.50");
        });

        it("recusa valor não inteiro", () => {
            expect(() => Money.toDecimalString(19.9)).toThrow(BusinessRuleError);
        });
    });

    describe("toDisplay", () => {
        it("formata centavos como texto monetário em reais", () => {
            expect(Money.toDisplay(1990)).toBe("R$ 19,90");
        });
    });
});
