import { describe, expect, it } from "vitest";
import { OrderValidator } from "../../../src/infra/validators/OrderValidator";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";

const validItem = { productId: "8f14e45f-ceea-467e-a4c7-8f5b3a6b1a3c", quantity: 2 };
const validAddressId = "3d594650-3436-11e5-bf21-0800200c9a66";

const validPayload = {
    addressId: validAddressId,
    shippingServiceId: 1,
    items: [validItem],
};

describe("OrderValidator", () => {
    describe("validateCheckout", () => {
        it("aceita um payload de checkout válido", () => {
            const validator = new OrderValidator();

            const result = validator.validateCheckout(validPayload);

            expect(result.items).toEqual([validItem]);
            expect(result.addressId).toBe(validAddressId);
            expect(result.shippingServiceId).toBe(1);
        });

        it("recusa quando a lista de itens está ausente", () => {
            const validator = new OrderValidator();

            expect(() => validator.validateCheckout({ addressId: validAddressId, shippingServiceId: 1 })).toThrow(
                ValidationError
            );
        });

        it("recusa lista de itens vazia", () => {
            const validator = new OrderValidator();

            expect(() => validator.validateCheckout({ ...validPayload, items: [] })).toThrow(ValidationError);
        });

        it("recusa item com productId que não é um UUID", () => {
            const validator = new OrderValidator();

            expect(() =>
                validator.validateCheckout({ ...validPayload, items: [{ productId: "not-a-uuid", quantity: 1 }] })
            ).toThrow(ValidationError);
        });

        it("recusa item com quantidade zero ou negativa", () => {
            const validator = new OrderValidator();

            expect(() =>
                validator.validateCheckout({ ...validPayload, items: [{ ...validItem, quantity: 0 }] })
            ).toThrow(ValidationError);
        });

        it("recusa item com quantidade não inteira", () => {
            const validator = new OrderValidator();

            expect(() =>
                validator.validateCheckout({ ...validPayload, items: [{ ...validItem, quantity: 1.5 }] })
            ).toThrow(ValidationError);
        });

        it("recusa addressId ausente", () => {
            const validator = new OrderValidator();
            const { addressId, ...withoutAddressId } = validPayload;

            expect(() => validator.validateCheckout(withoutAddressId)).toThrow(ValidationError);
        });

        it("recusa addressId que não é um UUID", () => {
            const validator = new OrderValidator();

            expect(() => validator.validateCheckout({ ...validPayload, addressId: "not-a-uuid" })).toThrow(
                ValidationError
            );
        });

        it("recusa shippingServiceId ausente", () => {
            const validator = new OrderValidator();
            const { shippingServiceId, ...withoutShippingServiceId } = validPayload;

            expect(() => validator.validateCheckout(withoutShippingServiceId)).toThrow(ValidationError);
        });

        it("recusa shippingServiceId zero ou negativo", () => {
            const validator = new OrderValidator();

            expect(() => validator.validateCheckout({ ...validPayload, shippingServiceId: 0 })).toThrow(
                ValidationError
            );
        });

        it("descarta qualquer campo de frete/preço adulterado no payload — não existe campo pra isso no schema, então o Zod remove antes mesmo do UseCase ver", () => {
            const validator = new OrderValidator();

            const result = validator.validateCheckout({
                ...validPayload,
                freightCents: 1,
                freight: 1,
                price: 999999,
                totalCents: 1,
            } as unknown as Record<string, unknown>);

            expect(result).not.toHaveProperty("freightCents");
            expect(result).not.toHaveProperty("freight");
            expect(result).not.toHaveProperty("price");
            expect(result).not.toHaveProperty("totalCents");
        });
    });

    describe("formatError", () => {
        it("formata um ValidationError em um mapa de campo para lista de mensagens", () => {
            const validator = new OrderValidator();
            let caughtError: unknown;

            try {
                validator.validateCheckout({ ...validPayload, items: [] });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.items).toBeDefined();
            expect(Array.isArray(formatted.items)).toBe(true);
        });

        it("retorna mensagem genérica quando o erro não é um ValidationError", () => {
            const validator = new OrderValidator();

            const formatted = validator.formatError(new Error("erro qualquer"));

            expect(formatted).toEqual({ general: ["Ocorreu um erro inesperado na validação dos dados."] });
        });
    });
});
