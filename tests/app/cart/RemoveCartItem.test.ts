import { beforeEach, describe, expect, it } from "vitest";
import { RemoveCartItem } from "../../../src/app/cart/useCase/RemoveCartItem";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const useCase = new RemoveCartItem(cartItemRepo);
    return { useCase, cartItemRepo };
};

describe("RemoveCartItem", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("remove o item do carrinho", async () => {
        await context.cartItemRepo.save(CartItem.build(createId, "cart-1", "product-1", 2));

        await context.useCase.execute({ cartId: "cart-1", productId: "product-1" });

        const remaining = await context.cartItemRepo.findBy({ cartId: "cart-1", productId: "product-1" } as never);
        expect(remaining).toBeNull();
    });

    it("recusa remover item que não existe no carrinho", async () => {
        await expect(context.useCase.execute({ cartId: "cart-1", productId: "product-1" })).rejects.toThrow(
            NotFoundError
        );
        await expect(context.useCase.execute({ cartId: "cart-1", productId: "product-1" })).rejects.toThrow(
            "Item não encontrado no carrinho."
        );
    });

    it("nunca remove item de outro carrinho (recurso de outro dono responde como inexistente)", async () => {
        await context.cartItemRepo.save(CartItem.build(createId, "outro-carrinho", "product-1", 2));

        await expect(context.useCase.execute({ cartId: "cart-1", productId: "product-1" })).rejects.toThrow(
            NotFoundError
        );
        const stillThere = await context.cartItemRepo.findBy({ cartId: "outro-carrinho", productId: "product-1" } as never);
        expect(stillThere).not.toBeNull();
    });
});
