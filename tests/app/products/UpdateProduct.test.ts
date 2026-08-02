import { beforeEach, describe, expect, it } from "vitest";
import { UpdateProduct } from "../../../src/app/products/useCase/UpdateProduct";
import { PRODUCTS_ALL_CACHE_KEY, productByIdCacheKey } from "../../../src/app/products/ProductCacheKeys";
import { Category } from "../../../src/domain/entites/Category";
import { Product } from "../../../src/domain/entites/Product";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const createId = () => "product-id-1";

const buildUseCase = () => {
    const repository = new InMemoryRepository<Product>();
    const categoryRepository = new InMemoryRepository<Category>();
    const cache = new FakeCachePort();
    const useCase = new UpdateProduct(repository, categoryRepository, cache);
    return { useCase, repository, categoryRepository, cache };
};

const buildProduct = () => Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);

describe("UpdateProduct", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("atualiza os campos informados e devolve o Output sem campos internos", async () => {
        const product = buildProduct();
        await context.repository.save(product);

        const output = await context.useCase.execute(product.id, { stock: 3 });

        expect(output).toEqual({
            id: product.id,
            name: "Dipirona",
            priceCents: 1990,
            discountCents: null,
            stock: 3,
            weight: 0.1,
            width: 5,
            height: 5,
            length: 10,
            categoryId: null,
        });
        expect(output).not.toHaveProperty("updated_at");
    });

    it("atualiza peso e dimensões", async () => {
        const product = buildProduct();
        await context.repository.save(product);

        const output = await context.useCase.execute(product.id, { weight: 0.5, width: 8 });

        expect(output.weight).toBe(0.5);
        expect(output.width).toBe(8);
    });

    it("recusa atualizar peso para um valor inválido", async () => {
        const product = buildProduct();
        await context.repository.save(product);

        await expect(context.useCase.execute(product.id, { weight: 0 })).rejects.toThrow(
            "Peso do produto deve ser maior que zero."
        );
    });

    it("recusa atualizar produto inexistente", async () => {
        await expect(context.useCase.execute("id-inexistente", { stock: 1 })).rejects.toThrow(NotFoundError);
        await expect(context.useCase.execute("id-inexistente", { stock: 1 })).rejects.toThrow(
            "Produto não encontrado."
        );
    });

    it("vincula o produto a uma categoria existente", async () => {
        const product = buildProduct();
        await context.repository.save(product);
        const category = Category.build(createId, "Medicamentos", null);
        await context.categoryRepository.save(category);

        const output = await context.useCase.execute(product.id, { categoryId: category.id });

        expect(output.categoryId).toBe(category.id);
    });

    it("recusa vincular o produto a uma categoria inexistente", async () => {
        const product = buildProduct();
        await context.repository.save(product);

        await expect(context.useCase.execute(product.id, { categoryId: "categoria-inexistente" })).rejects.toThrow(
            NotFoundError
        );
        await expect(context.useCase.execute(product.id, { categoryId: "categoria-inexistente" })).rejects.toThrow(
            "Categoria não encontrada."
        );
    });

    it("remove a categoria vinculada quando categoryId é enviado como null", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, "categoria-antiga");
        await context.repository.save(product);

        const output = await context.useCase.execute(product.id, { categoryId: null });

        expect(output.categoryId).toBeNull();
    });

    it("invalida o cache de listagem de produtos ao atualizar um produto", async () => {
        const product = buildProduct();
        await context.repository.save(product);
        await context.cache.set(PRODUCTS_ALL_CACHE_KEY, JSON.stringify([{ stale: true }]), 300);

        await context.useCase.execute(product.id, { stock: 1 });

        expect(await context.cache.get(PRODUCTS_ALL_CACHE_KEY)).toBeNull();
    });

    it("invalida o cache do produto individual ao atualizar", async () => {
        const product = buildProduct();
        await context.repository.save(product);
        await context.cache.set(productByIdCacheKey(product.id), JSON.stringify({ stale: true }), 300);

        await context.useCase.execute(product.id, { stock: 1 });

        expect(await context.cache.get(productByIdCacheKey(product.id))).toBeNull();
    });
});
