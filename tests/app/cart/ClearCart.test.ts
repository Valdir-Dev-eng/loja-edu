import { beforeEach, describe, expect, it } from "vitest";
import { ClearCart } from "../../../src/app/cart/useCase/ClearCart";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const useCase = new ClearCart(cartItemRepo);
    return { useCase, cartItemRepo };
};

describe("ClearCart", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("remove todos os itens do carrinho do usuário", async () => {
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", "product-1", 2));
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", "product-2", 1));

        await context.useCase.execute("user-1");

        const remaining = await context.cartItemRepo.findMany({ userId: "user-1" } as never);
        expect(remaining).toHaveLength(0);
    });

    it("não mexe no carrinho de outro usuário", async () => {
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", "product-1", 2));
        await context.cartItemRepo.save(CartItem.build(createId, "outro-usuario", "product-2", 1));

        await context.useCase.execute("user-1");

        const other = await context.cartItemRepo.findMany({ userId: "outro-usuario" } as never);
        expect(other).toHaveLength(1);
    });

    it("não quebra quando o carrinho já está vazio", async () => {
        await expect(context.useCase.execute("user-sem-carrinho")).resolves.toBeUndefined();
    });
});
