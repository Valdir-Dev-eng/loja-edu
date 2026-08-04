import { describe, expect, it } from "vitest";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const createId = () => "cart-item-id-1";

describe("CartItem", () => {
    describe("build", () => {
        it("cria o item do carrinho com carrinho, produto e quantidade", () => {
            const item = CartItem.build(createId, "cart-1", "product-1", 2);

            expect(item.id).toBe("cart-item-id-1");
            expect(item.cartId).toBe("cart-1");
            expect(item.productId).toBe("product-1");
            expect(item.quantity).toBe(2);
            expect(item.deleted_at).toBeNull();
        });

        it("recusa quantidade zero", () => {
            expect(() => CartItem.build(createId, "cart-1", "product-1", 0)).toThrow(BusinessRuleError);
            expect(() => CartItem.build(createId, "cart-1", "product-1", 0)).toThrow(
                "Quantidade deve ser um número inteiro maior que zero."
            );
        });

        it("recusa quantidade negativa", () => {
            expect(() => CartItem.build(createId, "cart-1", "product-1", -1)).toThrow(BusinessRuleError);
        });

        it("recusa quantidade não inteira", () => {
            expect(() => CartItem.build(createId, "cart-1", "product-1", 1.5)).toThrow(BusinessRuleError);
        });
    });

    describe("increaseQuantity", () => {
        it("soma a quantidade informada à quantidade atual", () => {
            const item = CartItem.build(createId, "cart-1", "product-1", 2);

            item.increaseQuantity(3);

            expect(item.quantity).toBe(5);
        });

        it("recusa incremento zero ou negativo", () => {
            const item = CartItem.build(createId, "cart-1", "product-1", 2);

            expect(() => item.increaseQuantity(0)).toThrow(BusinessRuleError);
            expect(() => item.increaseQuantity(-1)).toThrow(BusinessRuleError);
        });
    });

    describe("changeQuantity", () => {
        it("substitui a quantidade pelo valor informado", () => {
            const item = CartItem.build(createId, "cart-1", "product-1", 2);

            item.changeQuantity(7);

            expect(item.quantity).toBe(7);
        });

        it("recusa quantidade zero ou negativa", () => {
            const item = CartItem.build(createId, "cart-1", "product-1", 2);

            expect(() => item.changeQuantity(0)).toThrow(BusinessRuleError);
            expect(() => item.changeQuantity(-1)).toThrow(BusinessRuleError);
        });
    });

    describe("softDelete", () => {
        it("marca o item como removido", () => {
            const item = CartItem.build(createId, "cart-1", "product-1", 2);

            item.softDelete();

            expect(item.deleted_at).not.toBeNull();
        });

        it("recusa remover um item já removido", () => {
            const item = CartItem.build(createId, "cart-1", "product-1", 2);
            item.softDelete();

            expect(() => item.softDelete()).toThrow(ConflictError);
            expect(() => item.softDelete()).toThrow("Item já foi removido do carrinho.");
        });
    });
});
