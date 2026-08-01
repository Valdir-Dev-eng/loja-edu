import { beforeEach, describe, expect, it } from "vitest";
import { CreateProduct } from "../../../src/app/products/useCase/CreateProduct";
import { PRODUCTS_ALL_CACHE_KEY } from "../../../src/app/products/ProductCacheKeys";
import { Category } from "../../../src/domain/entites/Category";
import { Product } from "../../../src/domain/entites/Product";
import { ConflictError } from "../../../src/domain/errors/ConflictError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

let sequence = 0;
const createId = () => `product-id-${++sequence}`;

const buildUseCase = () => {
    const repository = new InMemoryRepository<Product>();
    const categoryRepository = new InMemoryRepository<Category>();
    const cache = new FakeCachePort();
    const useCase = new CreateProduct(repository, categoryRepository, cache, createId);
    return { useCase, repository, categoryRepository, cache };
};

const validInput = {
    name: "Dipirona",
    priceCents: 1990,
    discountCents: null,
    stock: 10,
    weight: 0.1,
    width: 5,
    height: 5,
    length: 10,
    categoryId: null,
};

describe("CreateProduct", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cria o produto e devolve o Output sem campos internos", async () => {
        const output = await context.useCase.execute(validInput);

        expect(output).toEqual({ id: output.id, ...validInput });
        expect(output).not.toHaveProperty("deleted_at");
        const saved = await context.repository.findById(output.id);
        expect(saved?.name).toBe("Dipirona");
        expect(saved?.weight).toBe(0.1);
    });

    it("recusa criar produto com nome já cadastrado", async () => {
        await context.useCase.execute(validInput);

        await expect(context.useCase.execute({ ...validInput, priceCents: 990 })).rejects.toThrow(ConflictError);
        await expect(context.useCase.execute({ ...validInput, priceCents: 990 })).rejects.toThrow(
            "Produto já cadastrado."
        );
    });

    it("recusa criar produto sem peso válido", async () => {
        await expect(context.useCase.execute({ ...validInput, weight: 0 })).rejects.toThrow(
            "Peso do produto deve ser maior que zero."
        );
    });

    it("cria o produto vinculado a uma categoria existente", async () => {
        const category = Category.build(createId, "Medicamentos", null);
        await context.categoryRepository.save(category);

        const output = await context.useCase.execute({ ...validInput, categoryId: category.id });

        expect(output.categoryId).toBe(category.id);
    });

    it("recusa criar produto com categoria inexistente", async () => {
        await expect(context.useCase.execute({ ...validInput, categoryId: "categoria-inexistente" })).rejects.toThrow(
            NotFoundError
        );
        await expect(context.useCase.execute({ ...validInput, categoryId: "categoria-inexistente" })).rejects.toThrow(
            "Categoria não encontrada."
        );
    });

    it("invalida o cache de listagem de produtos ao criar um produto", async () => {
        await context.cache.set(PRODUCTS_ALL_CACHE_KEY, JSON.stringify([{ stale: true }]), 300);

        await context.useCase.execute(validInput);

        expect(await context.cache.get(PRODUCTS_ALL_CACHE_KEY)).toBeNull();
    });
});
