import { describe, expect, it } from "vitest";
import { CartValidator } from "../../../src/infra/validators/CartValidator";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";

const VALID_PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("CartValidator", () => {
    describe("validateAdd", () => {
        it("aceita productId e quantidade válidos", () => {
            const validator = new CartValidator();

            const result = validator.validateAdd({ productId: VALID_PRODUCT_ID, quantity: 2 });

            expect(result).toEqual({ productId: VALID_PRODUCT_ID, quantity: 2 });
        });

        it("recusa productId que não é um UUID", () => {
            const validator = new CartValidator();

            expect(() => validator.validateAdd({ productId: "não-é-um-uuid", quantity: 1 })).toThrow(ValidationError);
        });

        it("recusa quantidade zero ou negativa", () => {
            const validator = new CartValidator();

            expect(() => validator.validateAdd({ productId: VALID_PRODUCT_ID, quantity: 0 })).toThrow(ValidationError);
            expect(() => validator.validateAdd({ productId: VALID_PRODUCT_ID, quantity: -1 })).toThrow(ValidationError);
        });

        it("recusa quantidade não inteira", () => {
            const validator = new CartValidator();

            expect(() => validator.validateAdd({ productId: VALID_PRODUCT_ID, quantity: 1.5 })).toThrow(ValidationError);
        });

        it("recusa quantidade acima do limite máximo", () => {
            const validator = new CartValidator();

            expect(() => validator.validateAdd({ productId: VALID_PRODUCT_ID, quantity: 1000 })).toThrow(ValidationError);
        });
    });

    describe("validateUpdateQuantity", () => {
        it("aceita quantidade zero (representa remoção)", () => {
            const validator = new CartValidator();

            const result = validator.validateUpdateQuantity({ quantity: 0 });

            expect(result.quantity).toBe(0);
        });

        it("recusa quantidade negativa", () => {
            const validator = new CartValidator();

            expect(() => validator.validateUpdateQuantity({ quantity: -1 })).toThrow(ValidationError);
        });
    });

    describe("formatError", () => {
        it("formata um ValidationError em um mapa de campo para lista de mensagens", () => {
            const validator = new CartValidator();
            let caughtError: unknown;

            try {
                validator.validateAdd({ productId: "invalido", quantity: 1 });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.productId).toBeDefined();
        });

        it("retorna mensagem genérica quando o erro não é um ValidationError", () => {
            const validator = new CartValidator();

            const formatted = validator.formatError(new Error("erro qualquer"));

            expect(formatted).toEqual({ general: ["Erro de validação desconhecido"] });
        });
    });
});
