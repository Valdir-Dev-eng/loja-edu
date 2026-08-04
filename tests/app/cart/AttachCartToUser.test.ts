import { beforeEach, describe, expect, it } from "vitest";
import { AttachCartToUser } from "../../../src/app/cart/useCase/AttachCartToUser";
import { Cart } from "../../../src/domain/entites/Cart";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { Product } from "../../../src/domain/entites/Product";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartRepo = new InMemoryRepository<Cart>();
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const productRepo = new InMemoryRepository<Product>();
    const useCase = new AttachCartToUser(cartRepo, cartItemRepo, productRepo, createId);
    return { useCase, cartRepo, cartItemRepo, productRepo };
};

describe("AttachCartToUser", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("não faz nada quando não havia cookie de carrinho no momento do login", async () => {
        await expect(context.useCase.execute({ cartIdFromCookie: null, userId: "user-1" })).resolves.toBeUndefined();
        expect(await context.cartRepo.findAll()).toHaveLength(0);
    });

    it("não faz nada quando o cookie aponta pra um carrinho que não existe (id forjado/expirado)", async () => {
        await expect(
            context.useCase.execute({ cartIdFromCookie: "carrinho-inexistente", userId: "user-1" })
        ).resolves.toBeUndefined();
    });

    it("MENTE MALICIOSA: nunca anexa ao usuário logado um carrinho que já pertence a outra pessoa", async () => {
        const victimCart = Cart.build(createId);
        victimCart.attachUser("vitima");
        await context.cartRepo.save(victimCart);

        await context.useCase.execute({ cartIdFromCookie: victimCart.id, userId: "atacante" });

        const stillVictims = await context.cartRepo.findById(victimCart.id);
        expect(stillVictims?.userId).toBe("vitima");
    });

    it("anexa direto o carrinho anônimo quando o usuário nunca teve carrinho antes", async () => {
        const anonymousCart = Cart.build(createId);
        await context.cartRepo.save(anonymousCart);

        await context.useCase.execute({ cartIdFromCookie: anonymousCart.id, userId: "user-1" });

        const updated = await context.cartRepo.findById(anonymousCart.id);
        expect(updated?.userId).toBe("user-1");
    });

    it("funde (soma) os itens do carrinho anônimo com o carrinho que o usuário já tinha salvo", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);

        const anonymousCart = Cart.build(createId);
        await context.cartRepo.save(anonymousCart);
        await context.cartItemRepo.save(CartItem.build(createId, anonymousCart.id, product.id, 3));

        const existingUserCart = Cart.build(createId);
        existingUserCart.attachUser("user-1");
        await context.cartRepo.save(existingUserCart);
        await context.cartItemRepo.save(CartItem.build(createId, existingUserCart.id, product.id, 2));

        await context.useCase.execute({ cartIdFromCookie: anonymousCart.id, userId: "user-1" });

        const mergedItems = await context.cartItemRepo.findMany({ cartId: existingUserCart.id } as never);
        expect(mergedItems).toHaveLength(1);
        expect(mergedItems[0].quantity).toBe(5);
        expect(await context.cartRepo.findById(anonymousCart.id)).toBeUndefined();
    });

    it("limita a soma da fusão ao estoque real do produto", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 4, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);

        const anonymousCart = Cart.build(createId);
        await context.cartRepo.save(anonymousCart);
        await context.cartItemRepo.save(CartItem.build(createId, anonymousCart.id, product.id, 3));

        const existingUserCart = Cart.build(createId);
        existingUserCart.attachUser("user-1");
        await context.cartRepo.save(existingUserCart);
        await context.cartItemRepo.save(CartItem.build(createId, existingUserCart.id, product.id, 3));

        await context.useCase.execute({ cartIdFromCookie: anonymousCart.id, userId: "user-1" });

        const mergedItems = await context.cartItemRepo.findMany({ cartId: existingUserCart.id } as never);
        expect(mergedItems[0].quantity).toBe(4);
    });

    it("ignora silenciosamente produto do carrinho anônimo que não existe mais", async () => {
        const anonymousCart = Cart.build(createId);
        await context.cartRepo.save(anonymousCart);
        await context.cartItemRepo.save(CartItem.build(createId, anonymousCart.id, "produto-removido", 1));

        const existingUserCart = Cart.build(createId);
        existingUserCart.attachUser("user-1");
        await context.cartRepo.save(existingUserCart);

        await expect(
            context.useCase.execute({ cartIdFromCookie: anonymousCart.id, userId: "user-1" })
        ).resolves.toBeUndefined();
        const mergedItems = await context.cartItemRepo.findMany({ cartId: existingUserCart.id } as never);
        expect(mergedItems).toHaveLength(0);
    });
});
