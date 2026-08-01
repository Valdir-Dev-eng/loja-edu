import { beforeEach, describe, expect, it } from "vitest";
import { GetAllProducts } from "../../../src/app/products/useCase/GetAllProducts";
import { PRODUCTS_ALL_CACHE_KEY, PRODUCTS_CACHE_TTL_SECONDS } from "../../../src/app/products/ProductCacheKeys";
import { Product } from "../../../src/domain/entites/Product";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

let sequence = 0;
const createId = () => `product-id-${++sequence}`;

const buildUseCase = () => {
    const repository = new InMemoryRepository<Product>();
    const cache = new FakeCachePort();
    const useCase = new GetAllProducts(repository, cache);
    return { useCase, repository, cache };
};

describe("GetAllProducts", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("retorna lista vazia quando não há produtos", async () => {
        const output = await context.useCase.execute();

        expect(output).toEqual([]);
    });

    it("retorna todos os produtos no formato de Output", async () => {
        const first = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        const second = Product.build(createId, "Paracetamol", 1250, 100, 5, 0.05, 4, 4, 8, null);
        await context.repository.save(first);
        await context.repository.save(second);

        const output = await context.useCase.execute();

        expect(output).toHaveLength(2);
        expect(output).toContainEqual({
            id: first.id,
            name: "Dipirona",
            priceCents: 1990,
            discountCents: null,
            stock: 10,
            weight: 0.1,
            width: 5,
            height: 5,
            length: 10,
            categoryId: null,
        });
        expect(output).toContainEqual({
            id: second.id,
            name: "Paracetamol",
            priceCents: 1250,
            discountCents: 100,
            stock: 5,
            weight: 0.05,
            width: 4,
            height: 4,
            length: 8,
            categoryId: null,
        });
    });

    it("não expõe campos internos da entidade no Output", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.repository.save(product);

        const [output] = await context.useCase.execute();

        expect(output).not.toHaveProperty("deleted_at");
        expect(output).not.toHaveProperty("created_at");
        expect(output).not.toHaveProperty("updated_at");
    });

    describe("cache-aside", () => {
        it("grava no cache com o TTL de segurança quando o cache está vazio", async () => {
            const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
            await context.repository.save(product);

            await context.useCase.execute();

            const cached = await context.cache.get(PRODUCTS_ALL_CACHE_KEY);
            expect(cached).not.toBeNull();
            expect(JSON.parse(cached as string)).toEqual([
                {
                    id: product.id,
                    name: "Dipirona",
                    priceCents: 1990,
                    discountCents: null,
                    stock: 10,
                    weight: 0.1,
                    width: 5,
                    height: 5,
                    length: 10,
                    categoryId: null,
                },
            ]);
            expect(context.cache.getTtl(PRODUCTS_ALL_CACHE_KEY)).toBe(PRODUCTS_CACHE_TTL_SECONDS);
        });

        it("devolve o conteúdo do cache sem tocar o repositório quando o cache já está populado", async () => {
            const cachedOutput = [
                {
                    id: "product-cache-only",
                    name: "Só existe no cache",
                    priceCents: 1,
                    discountCents: null,
                    stock: 1,
                    weight: 1,
                    width: 1,
                    height: 1,
                    length: 1,
                    categoryId: null,
                },
            ];
            await context.cache.set(PRODUCTS_ALL_CACHE_KEY, JSON.stringify(cachedOutput), PRODUCTS_CACHE_TTL_SECONDS);
            const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
            await context.repository.save(product);

            const output = await context.useCase.execute();

            expect(output).toEqual(cachedOutput);
        });
    });
});
