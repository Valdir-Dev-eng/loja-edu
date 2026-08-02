import { describe, expect, it } from "vitest";
import { GetProductById } from "../../src/app/products/useCase/GetProductById";
import { ProductRepository } from "../../src/infra/repository/ProductRepository";
import { Product } from "../../src/domain/entites/Product";
import { TestWithMemoryDataAcess } from "../doubles/TestWithMemoryDataAcess";
import { FakeCachePort } from "../doubles/FakeCachePort";

const createId = () => "product-concurrency-cache";
const COLLECTION_NAME = "produtos";

describe("GetProductById — prova de concorrência real (cache-aside)", () => {
    it("todas as respostas concorrentes trazem o produto certo, mesmo disputando o mesmo cache vazio", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new ProductRepository(db);
        const cache = new FakeCachePort();
        const useCase = new GetProductById(repo, cache);
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await repo.save(product);

        const results = await Promise.all(Array.from({ length: 20 }, () => useCase.execute(product.id)));

        expect(results.every((result) => result.id === product.id && result.name === "Dipirona")).toBe(true);
    });

    it("cache vazio sob concorrência real vira cache stampede - todas as leituras concorrentes batem no banco, sem coalescer requisição", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new ProductRepository(db);
        const cache = new FakeCachePort();
        const useCase = new GetProductById(repo, cache);
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await repo.save(product);

        await Promise.all(Array.from({ length: 20 }, () => useCase.execute(product.id)));

        expect(db.callsTo(COLLECTION_NAME, "findOne")).toBeGreaterThan(1);
    });

    it("depois que o cache populou, leituras concorrentes não tocam mais o banco", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new ProductRepository(db);
        const cache = new FakeCachePort();
        const useCase = new GetProductById(repo, cache);
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await repo.save(product);
        await useCase.execute(product.id);
        const hitsAfterWarmup = db.callsTo(COLLECTION_NAME, "findOne");

        await Promise.all(Array.from({ length: 20 }, () => useCase.execute(product.id)));

        expect(db.callsTo(COLLECTION_NAME, "findOne")).toBe(hitsAfterWarmup);
    });
});
