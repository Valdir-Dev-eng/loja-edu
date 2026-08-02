import { describe, expect, it } from "vitest";
import { ProductRepository } from "../../src/infra/repository/ProductRepository";
import { Product } from "../../src/domain/entites/Product";
import { TestWithMemoryDataAcess } from "../doubles/TestWithMemoryDataAcess";

const createId = () => "product-concurrency-stock";

describe("ProductRepository — prova de concorrência real (decremento de estoque)", () => {
    it("perde decrementos quando compras concorrentes leem o estoque e escrevem o valor calculado sem trava atômica, igual o CheckoutOrder faz hoje", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new ProductRepository(db);
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await repo.save(product);

        const concurrentPurchases = 10;
        await Promise.all(
            Array.from({ length: concurrentPurchases }, async () => {
                const current = await repo.findById(product.id);
                await repo.update(product.id, { stock: current!.stock - 1 });
            })
        );

        const final = await repo.findById(product.id);
        expect(final!.stock).toBeGreaterThan(0);
    });
});
