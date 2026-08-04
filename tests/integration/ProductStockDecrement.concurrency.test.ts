import { describe, expect, it } from "vitest";
import { ProductRepository } from "../../src/infra/repository/ProductRepository";
import { Product } from "../../src/domain/entites/Product";
import { TestWithMemoryDataAcess } from "../doubles/TestWithMemoryDataAcess";

const createId = () => "product-concurrency-stock";

describe("ProductRepository — decrementFieldIfSufficient sob concorrência real", () => {
    it("nunca deixa o estoque ficar negativo e nunca perde decremento, mesmo com compras simultâneas", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new ProductRepository(db);
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await repo.save(product);

        const concurrentPurchases = 10;
        const results = await Promise.all(
            Array.from({ length: concurrentPurchases }, () => repo.decrementFieldIfSufficient(product.id, "stock", 1))
        );

        const successCount = results.filter(Boolean).length;
        expect(successCount).toBe(10);
        const final = await repo.findById(product.id);
        expect(final!.stock).toBe(0);
    });

    it("recusa decremento além do estoque disponível, mesmo disputando a última unidade em paralelo", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new ProductRepository(db);
        const product = Product.build(createId, "Dipirona", 1990, null, 1, 0.1, 5, 5, 10, null);
        await repo.save(product);

        const concurrentPurchases = 10;
        const results = await Promise.all(
            Array.from({ length: concurrentPurchases }, () => repo.decrementFieldIfSufficient(product.id, "stock", 1))
        );

        const successCount = results.filter(Boolean).length;
        expect(successCount).toBe(1);
        const final = await repo.findById(product.id);
        expect(final!.stock).toBe(0);
    });
});
