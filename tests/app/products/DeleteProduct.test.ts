import { beforeEach, describe, expect, it } from "vitest";
import { DeleteProduct } from "../../../src/app/products/useCase/DeleteProduct";
import { PRODUCTS_ALL_CACHE_KEY, productByIdCacheKey } from "../../../src/app/products/ProductCacheKeys";
import { Product } from "../../../src/domain/entites/Product";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const createId = () => "product-id-1";

const buildUseCase = () => {
    const repository = new InMemoryRepository<Product>();
    const cache = new FakeCachePort();
    const useCase = new DeleteProduct(repository, cache);
    return { useCase, repository, cache };
};

describe("DeleteProduct", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("marca o produto como deletado (soft delete)", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.repository.save(product);

        await context.useCase.execute(product.id);

        const persisted = await context.repository.findById(product.id);
        expect(persisted?.deleted_at).not.toBeNull();
    });

    it("recusa deletar produto inexistente", async () => {
        await expect(context.useCase.execute("id-inexistente")).rejects.toThrow(NotFoundError);
        await expect(context.useCase.execute("id-inexistente")).rejects.toThrow("Produto não encontrado.");
    });

    it("invalida o cache de listagem de produtos ao deletar um produto", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.repository.save(product);
        await context.cache.set(PRODUCTS_ALL_CACHE_KEY, JSON.stringify([{ stale: true }]), 300);

        await context.useCase.execute(product.id);

        expect(await context.cache.get(PRODUCTS_ALL_CACHE_KEY)).toBeNull();
    });

    it("invalida o cache do produto individual ao deletar", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.repository.save(product);
        await context.cache.set(productByIdCacheKey(product.id), JSON.stringify({ stale: true }), 300);

        await context.useCase.execute(product.id);

        expect(await context.cache.get(productByIdCacheKey(product.id))).toBeNull();
    });
});
