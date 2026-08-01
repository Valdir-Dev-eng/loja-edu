import { beforeEach, describe, expect, it } from "vitest";
import { CreateCategory } from "../../../src/app/categories/useCase/CreateCategory";
import { CATEGORIES_ALL_CACHE_KEY } from "../../../src/app/categories/CategoryCacheKeys";
import { Category } from "../../../src/domain/entites/Category";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

let sequence = 0;
const createId = () => `category-id-${++sequence}`;

const buildUseCase = () => {
    const repository = new InMemoryRepository<Category>();
    const cache = new FakeCachePort();
    const useCase = new CreateCategory(repository, cache, createId);
    return { useCase, repository, cache };
};

describe("CreateCategory", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cria a categoria e devolve o Output sem campos internos", async () => {
        const output = await context.useCase.execute({ name: "Medicamentos", description: "Uso contínuo" });

        expect(output).toEqual({ id: output.id, name: "Medicamentos", description: "Uso contínuo" });
        expect(output).not.toHaveProperty("deleted_at");
        const saved = await context.repository.findById(output.id);
        expect(saved?.name).toBe("Medicamentos");
    });

    it("recusa nome vazio", async () => {
        await expect(context.useCase.execute({ name: "   ", description: null })).rejects.toThrow(BusinessRuleError);
        await expect(context.useCase.execute({ name: "   ", description: null })).rejects.toThrow(
            "Nome da categoria é obrigatório."
        );
    });

    it("invalida o cache de listagem de categorias ao criar uma categoria", async () => {
        await context.cache.set(CATEGORIES_ALL_CACHE_KEY, JSON.stringify([{ stale: true }]), 300);

        await context.useCase.execute({ name: "Medicamentos", description: null });

        expect(await context.cache.get(CATEGORIES_ALL_CACHE_KEY)).toBeNull();
    });
});
