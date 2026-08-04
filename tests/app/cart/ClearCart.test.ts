import { beforeEach, describe, expect, it } from "vitest";
import { ClearCart } from "../../../src/app/cart/useCase/ClearCart";
import { Cart } from "../../../src/domain/entites/Cart";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartRepo = new InMemoryRepository<Cart>();
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const useCase = new ClearCart(cartRepo, cartItemRepo);
    return { useCase, cartRepo, cartItemRepo };
};

const buildUserCart = async (context: ReturnType<typeof buildUseCase>, userId: string) => {
    const cart = Cart.build(createId);
    cart.attachUser(userId);
    await context.cartRepo.save(cart);
    return cart;
};

describe("ClearCart", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("remove todos os itens do carrinho do usuário", async () => {
        const cart = await buildUserCart(context, "user-1");
        await context.cartItemRepo.save(CartItem.build(createId, cart.id, "product-1", 2));
        await context.cartItemRepo.save(CartItem.build(createId, cart.id, "product-2", 1));

        await context.useCase.execute("user-1");

        const remaining = await context.cartItemRepo.findMany({ cartId: cart.id } as never);
        expect(remaining).toHaveLength(0);
    });

    it("não mexe no carrinho de outro usuário", async () => {
        const cartA = await buildUserCart(context, "user-1");
        const cartB = await buildUserCart(context, "outro-usuario");
        await context.cartItemRepo.save(CartItem.build(createId, cartA.id, "product-1", 2));
        await context.cartItemRepo.save(CartItem.build(createId, cartB.id, "product-2", 1));

        await context.useCase.execute("user-1");

        const other = await context.cartItemRepo.findMany({ cartId: cartB.id } as never);
        expect(other).toHaveLength(1);
    });

    it("não quebra quando o usuário nunca teve carrinho", async () => {
        await expect(context.useCase.execute("user-sem-carrinho")).resolves.toBeUndefined();
    });
});
