import { beforeEach, describe, expect, it } from "vitest";
import { GetProductById } from "../../../src/app/products/useCase/GetProductById";
import { PRODUCTS_CACHE_TTL_SECONDS, productByIdCacheKey } from "../../../src/app/products/ProductCacheKeys";
import { Product } from "../../../src/domain/entites/Product";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const createId = () => "product-id-1";

const buildUseCase = () => {
    const repository = new InMemoryRepository<Product>();
    const cache = new FakeCachePort();
    const useCase = new GetProductById(repository, cache);
    return { useCase, repository, cache };
};

describe("GetProductById", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("retorna o produto no formato de Output", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.repository.save(product);

        const output = await context.useCase.execute(product.id);

        expect(output).toEqual({
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
        });
    });

    it("não expõe campos internos da entidade no Output", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        product.softDelete();
        await context.repository.save(product);

        const output = await context.useCase.execute(product.id);

        expect(output).not.toHaveProperty("deleted_at");
        expect(output).not.toHaveProperty("created_at");
        expect(output).not.toHaveProperty("updated_at");
    });

    it("recusa buscar produto inexistente", async () => {
        await expect(context.useCase.execute("id-inexistente")).rejects.toThrow(NotFoundError);
        await expect(context.useCase.execute("id-inexistente")).rejects.toThrow("Produto não encontrado.");
    });

    describe("cache-aside", () => {
        it("grava no cache com o TTL de segurança quando o cache está vazio", async () => {
            const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
            await context.repository.save(product);

            await context.useCase.execute(product.id);

            const cacheKey = productByIdCacheKey(product.id);
            const cached = await context.cache.get(cacheKey);
            expect(cached).not.toBeNull();
            expect(JSON.parse(cached as string)).toEqual({
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
            });
            expect(context.cache.getTtl(cacheKey)).toBe(PRODUCTS_CACHE_TTL_SECONDS);
        });

        it("devolve o conteúdo do cache sem tocar o repositório quando o cache já está populado", async () => {
            const cachedOutput = {
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
            };
            await context.cache.set(
                productByIdCacheKey("product-cache-only"),
                JSON.stringify(cachedOutput),
                PRODUCTS_CACHE_TTL_SECONDS
            );

            const output = await context.useCase.execute("product-cache-only");

            expect(output).toEqual(cachedOutput);
        });
    });
});
