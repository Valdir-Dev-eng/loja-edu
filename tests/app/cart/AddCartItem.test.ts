import { beforeEach, describe, expect, it } from "vitest";
import { AddCartItem } from "../../../src/app/cart/useCase/AddCartItem";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { Product } from "../../../src/domain/entites/Product";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const productRepo = new InMemoryRepository<Product>();
    const useCase = new AddCartItem(cartItemRepo, productRepo, createId);
    return { useCase, cartItemRepo, productRepo };
};

describe("AddCartItem", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cria um item novo no carrinho quando o produto ainda não está lá", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);

        const output = await context.useCase.execute({ cartId: "cart-1", productId: product.id, quantity: 2 });

        expect(output.quantity).toBe(2);
        const saved = await context.cartItemRepo.findBy({ cartId: "cart-1", productId: product.id } as never);
        expect(saved?.quantity).toBe(2);
    });

    it("soma à quantidade já existente quando o produto já está no carrinho", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "cart-1", product.id, 3));

        const output = await context.useCase.execute({ cartId: "cart-1", productId: product.id, quantity: 2 });

        expect(output.quantity).toBe(5);
    });

    it("limita a quantidade adicionada ao estoque disponível", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 5, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "cart-1", product.id, 4));

        const output = await context.useCase.execute({ cartId: "cart-1", productId: product.id, quantity: 10 });

        expect(output.quantity).toBe(5);
    });

    it("recusa adicionar quando já está no limite do estoque", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 3, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "cart-1", product.id, 3));

        await expect(context.useCase.execute({ cartId: "cart-1", productId: product.id, quantity: 1 })).rejects.toThrow(
            BusinessRuleError
        );
        await expect(context.useCase.execute({ cartId: "cart-1", productId: product.id, quantity: 1 })).rejects.toThrow(
            "Estoque insuficiente para adicionar mais unidades de: Dipirona"
        );
    });

    it("recusa adicionar produto inexistente", async () => {
        await expect(
            context.useCase.execute({ cartId: "cart-1", productId: "produto-inexistente", quantity: 1 })
        ).rejects.toThrow(NotFoundError);
    });

    it("recusa adicionar produto removido (soft delete)", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        product.softDelete();
        await context.productRepo.save(product);

        await expect(
            context.useCase.execute({ cartId: "cart-1", productId: product.id, quantity: 1 })
        ).rejects.toThrow(NotFoundError);
    });

    it("dois carrinhos diferentes não interferem um no outro", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);

        await context.useCase.execute({ cartId: "cart-a", productId: product.id, quantity: 2 });
        await context.useCase.execute({ cartId: "cart-b", productId: product.id, quantity: 1 });

        const itemA = await context.cartItemRepo.findBy({ cartId: "cart-a", productId: product.id } as never);
        const itemB = await context.cartItemRepo.findBy({ cartId: "cart-b", productId: product.id } as never);
        expect(itemA?.quantity).toBe(2);
        expect(itemB?.quantity).toBe(1);
    });
});
