import { beforeEach, describe, expect, it } from "vitest";
import { ListCart } from "../../../src/app/cart/useCase/ListCart";
import { CartItem } from "../../../src/domain/entites/CartItem";
import { Product } from "../../../src/domain/entites/Product";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `id-${++sequence}`;

const buildUseCase = () => {
    const cartItemRepo = new InMemoryRepository<CartItem>();
    const productRepo = new InMemoryRepository<Product>();
    const useCase = new ListCart(cartItemRepo, productRepo);
    return { useCase, cartItemRepo, productRepo };
};

describe("ListCart", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("devolve vazio quando o usuário não tem itens no carrinho", async () => {
        const result = await context.useCase.execute("user-1");

        expect(result).toEqual([]);
    });

    it("devolve os itens do carrinho já hidratados com dado atual do produto", async () => {
        const product = Product.build(createId, "Dipirona", 1990, 500, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        const item = CartItem.build(createId, "user-1", product.id, 3);
        await context.cartItemRepo.save(item);

        const result = await context.useCase.execute("user-1");

        expect(result).toEqual([
            {
                productId: product.id,
                productName: "Dipirona",
                priceCents: 1990,
                discountCents: 500,
                stock: 10,
                quantity: 3,
            },
        ]);
    });

    it("nunca devolve item de outro usuário", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.productRepo.save(product);
        await context.cartItemRepo.save(CartItem.build(createId, "outro-usuario", product.id, 1));

        const result = await context.useCase.execute("user-1");

        expect(result).toEqual([]);
    });

    it("omite item cujo produto não existe mais (removido do catálogo)", async () => {
        await context.cartItemRepo.save(CartItem.build(createId, "user-1", "produto-removido", 1));

        const result = await context.useCase.execute("user-1");

        expect(result).toEqual([]);
    });
});
