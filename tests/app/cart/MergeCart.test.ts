import { beforeEach, describe, expect, it } from "vitest";
import { MergeCart } from "../../../src/app/cart/useCase/MergeCart";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { Product } from "../../../src/domain/entites/Product";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const productRepo = new InMemoryRepository<Product>();
    const useCase = new MergeCart(cartItemRepo, productRepo, createId);
    return { useCase, cartItemRepo, productRepo };
};

describe("MergeCart", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cria itens novos no carrinho do banco quando o usuário não tinha nada salvo", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);

        const result = await context.useCase.execute({ userId: "user-1", items: [{ productId: product.id, quantity: 2 }] });

        expect(result).toEqual([
            {
                productId: product.id,
                productName: "Dipirona",
                priceCents: 1990,
                discountCents: null,
                stock: 10,
                quantity: 2,
            },
        ]);
    });

    it("soma a quantidade do localStorage com a quantidade já salva no banco (os dois se somam)", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", product.id, 3));

        const result = await context.useCase.execute({ userId: "user-1", items: [{ productId: product.id, quantity: 4 }] });

        expect(result.find((item) => item.productId === product.id)?.quantity).toBe(7);
    });

    it("limita a soma ao estoque disponível", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 5, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", product.id, 3));

        const result = await context.useCase.execute({ userId: "user-1", items: [{ productId: product.id, quantity: 10 }] });

        expect(result.find((item) => item.productId === product.id)?.quantity).toBe(5);
    });

    it("ignora silenciosamente produto que não existe mais, sem quebrar o merge dos outros itens", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);

        const result = await context.useCase.execute({
            userId: "user-1",
            items: [
                { productId: "produto-removido", quantity: 1 },
                { productId: product.id, quantity: 2 },
            ],
        });

        expect(result).toHaveLength(1);
        expect(result[0].productId).toBe(product.id);
    });

    it("mantém itens que já estavam no carrinho do banco e não vieram no merge", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        const otherProduct = Product.build(createId, "Paracetamol", 1250, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.productRepo.save(otherProduct);
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", otherProduct.id, 1));

        const result = await context.useCase.execute({ userId: "user-1", items: [{ productId: product.id, quantity: 1 }] });

        expect(result.map((item) => item.productId).sort()).toEqual([otherProduct.id, product.id].sort());
    });
});
