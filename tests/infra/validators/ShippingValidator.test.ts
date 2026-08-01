import { describe, expect, it } from "vitest";
import { ShippingValidator } from "../../../src/infra/validators/ShippingValidator";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";

const validPayload = {
    destinationPostalCode: "01310100",
    items: [{ productId: "8f14e45f-ceea-467e-a4c7-8f5b3a6b1a3c", quantity: 2 }],
};

describe("ShippingValidator", () => {
    describe("validateQuote", () => {
        it("aceita um payload de cotação válido", () => {
            const validator = new ShippingValidator();

            const result = validator.validateQuote(validPayload);

            expect(result).toEqual(validPayload);
        });

        it("recusa CEP com menos de 8 dígitos", () => {
            const validator = new ShippingValidator();

            expect(() => validator.validateQuote({ ...validPayload, destinationPostalCode: "123" })).toThrow(
                ValidationError
            );
        });

        it("recusa CEP com letras", () => {
            const validator = new ShippingValidator();

            expect(() => validator.validateQuote({ ...validPayload, destinationPostalCode: "0131010A" })).toThrow(
                ValidationError
            );
        });

        it("recusa lista de itens vazia", () => {
            const validator = new ShippingValidator();

            expect(() => validator.validateQuote({ ...validPayload, items: [] })).toThrow(ValidationError);
        });

        it("recusa item com productId que não é UUID", () => {
            const validator = new ShippingValidator();

            expect(() =>
                validator.validateQuote({ ...validPayload, items: [{ productId: "not-a-uuid", quantity: 1 }] })
            ).toThrow(ValidationError);
        });

        it("recusa item com quantidade zero ou negativa", () => {
            const validator = new ShippingValidator();

            expect(() =>
                validator.validateQuote({
                    ...validPayload,
                    items: [{ productId: "8f14e45f-ceea-467e-a4c7-8f5b3a6b1a3c", quantity: 0 }],
                })
            ).toThrow(ValidationError);
        });
    });

    describe("formatError", () => {
        it("formata um ValidationError em um mapa de campo para lista de mensagens", () => {
            const validator = new ShippingValidator();
            let caughtError: unknown;

            try {
                validator.validateQuote({ ...validPayload, destinationPostalCode: "123" });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.destinationPostalCode).toBeDefined();
        });

        it("retorna mensagem genérica quando o erro não é um ValidationError", () => {
            const validator = new ShippingValidator();

            const formatted = validator.formatError(new Error("erro qualquer"));

            expect(formatted).toEqual({ general: ["Erro de validação desconhecido"] });
        });
    });
});
