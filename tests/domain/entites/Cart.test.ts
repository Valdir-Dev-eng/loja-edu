import { describe, expect, it } from "vitest";
import { Cart } from "../../../src/domain/entites/Cart";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const createId = () => "cart-id-1";

describe("Cart", () => {
    describe("build", () => {
        it("cria um carrinho anônimo, sem usuário", () => {
            const cart = Cart.build(createId);

            expect(cart.id).toBe("cart-id-1");
            expect(cart.userId).toBeNull();
            expect(cart.deleted_at).toBeNull();
        });
    });

    describe("attachUser", () => {
        it("associa o carrinho anônimo a um usuário", () => {
            const cart = Cart.build(createId);

            cart.attachUser("user-1");

            expect(cart.userId).toBe("user-1");
        });

        it("recusa associar um carrinho que já tem dono", () => {
            const cart = Cart.build(createId);
            cart.attachUser("user-1");

            expect(() => cart.attachUser("user-2")).toThrow(ConflictError);
            expect(() => cart.attachUser("user-2")).toThrow("Carrinho já pertence a um usuário.");
        });
    });

    describe("belongsTo", () => {
        it("carrinho anônimo pertence a qualquer um (inclusive visitante sem sessão)", () => {
            const cart = Cart.build(createId);

            expect(cart.belongsTo(null)).toBe(true);
            expect(cart.belongsTo("qualquer-usuario")).toBe(true);
        });

        it("carrinho com dono só pertence ao próprio dono", () => {
            const cart = Cart.build(createId);
            cart.attachUser("user-1");

            expect(cart.belongsTo("user-1")).toBe(true);
            expect(cart.belongsTo("user-2")).toBe(false);
            expect(cart.belongsTo(null)).toBe(false);
        });
    });

    describe("softDelete", () => {
        it("marca o carrinho como deletado", () => {
            const cart = Cart.build(createId);

            cart.softDelete();

            expect(cart.deleted_at).not.toBeNull();
        });

        it("recusa deletar um carrinho já deletado", () => {
            const cart = Cart.build(createId);
            cart.softDelete();

            expect(() => cart.softDelete()).toThrow(ConflictError);
            expect(() => cart.softDelete()).toThrow("Carrinho já está deletado.");
        });
    });
});
