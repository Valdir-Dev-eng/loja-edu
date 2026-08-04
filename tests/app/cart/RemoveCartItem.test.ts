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

    it("remove o item do carrinho do usuário", async () => {
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", "product-1", 2));

        await context.useCase.execute({ userId: "user-1", productId: "product-1" });

        const remaining = await context.cartItemRepo.findBy({ userId: "user-1", productId: "product-1" } as never);
        expect(remaining).toBeNull();
    });

    it("recusa remover item que não existe no carrinho do usuário", async () => {
        await expect(context.useCase.execute({ userId: "user-1", productId: "product-1" })).rejects.toThrow(
            NotFoundError
        );
        await expect(context.useCase.execute({ userId: "user-1", productId: "product-1" })).rejects.toThrow(
            "Item não encontrado no carrinho."
        );
    });

    it("nunca remove item de outro usuário (recurso pertence a outro dono responde como inexistente)", async () => {
        await context.cartItemRepo.save(CartItem.build(createId, "outro-usuario", "product-1", 2));

        await expect(context.useCase.execute({ userId: "user-1", productId: "product-1" })).rejects.toThrow(
            NotFoundError
        );
        const stillThere = await context.cartItemRepo.findBy({ userId: "outro-usuario", productId: "product-1" } as never);
        expect(stillThere).not.toBeNull();
    });
});
