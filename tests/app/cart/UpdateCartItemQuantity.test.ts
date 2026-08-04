import { beforeEach, describe, expect, it } from "vitest";
import { UpdateCartItemQuantity } from "../../../src/app/cart/useCase/UpdateCartItemQuantity";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { Product } from "../../../src/domain/entites/Product";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const productRepo = new InMemoryRepository<Product>();
    const useCase = new UpdateCartItemQuantity(cartItemRepo, productRepo);
    return { useCase, cartItemRepo, productRepo };
};

describe("UpdateCartItemQuantity", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("atualiza a quantidade do item existente", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", product.id, 2));

        const output = await context.useCase.execute({ userId: "user-1", productId: product.id, quantity: 5 });

        expect(output?.quantity).toBe(5);
    });

    it("limita a quantidade ao estoque disponível", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 4, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", product.id, 2));

        const output = await context.useCase.execute({ userId: "user-1", productId: product.id, quantity: 100 });

        expect(output?.quantity).toBe(4);
    });

    it("remove o item quando a quantidade informada é zero", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", product.id, 2));

        const output = await context.useCase.execute({ userId: "user-1", productId: product.id, quantity: 0 });

        expect(output).toBeNull();
        const remaining = await context.cartItemRepo.findBy({ userId: "user-1", productId: product.id } as never);
        expect(remaining).toBeNull();
    });

    it("recusa atualizar item que não está no carrinho do usuário", async () => {
        await expect(
            context.useCase.execute({ userId: "user-1", productId: "produto-qualquer", quantity: 1 })
        ).rejects.toThrow(NotFoundError);
    });

    it("recusa atualizar quando o produto não existe mais", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", product.id, 2));
        product.softDelete();
        await context.productRepo.update(product.id, { deleted_at: new Date() });

        await expect(
            context.useCase.execute({ userId: "user-1", productId: product.id, quantity: 3 })
        ).rejects.toThrow(NotFoundError);
    });
});
