import { beforeEach, describe, expect, it } from "vitest";
import { ListCategories } from "../../../src/app/categories/useCase/ListCategories";
import { CATEGORIES_ALL_CACHE_KEY, CATEGORIES_CACHE_TTL_SECONDS } from "../../../src/app/categories/CategoryCacheKeys";
import { Category } from "../../../src/domain/entites/Category";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

let sequence = 0;
const createId = () => `category-id-${++sequence}`;

const buildUseCase = () => {
    const repository = new InMemoryRepository<Category>();
    const cache = new FakeCachePort();
    const useCase = new ListCategories(repository, cache);
    return { useCase, repository, cache };
};

describe("ListCategories", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("retorna lista vazia quando não há categorias", async () => {
        const output = await context.useCase.execute();

        expect(output).toEqual([]);
    });

    it("retorna todas as categorias no formato de Output", async () => {
        const first = Category.build(createId, "Medicamentos", null);
        const second = Category.build(createId, "Higiene", "Itens de higiene pessoal");
        await context.repository.save(first);
        await context.repository.save(second);

        const output = await context.useCase.execute();

        expect(output).toHaveLength(2);
        expect(output).toContainEqual({ id: first.id, name: "Medicamentos", description: null });
        expect(output).toContainEqual({ id: second.id, name: "Higiene", description: "Itens de higiene pessoal" });
    });

    describe("cache-aside", () => {
        it("grava no cache com o TTL de segurança quando o cache está vazio", async () => {
            const category = Category.build(createId, "Medicamentos", null);
            await context.repository.save(category);

            await context.useCase.execute();

            const cached = await context.cache.get(CATEGORIES_ALL_CACHE_KEY);
            expect(cached).not.toBeNull();
            expect(JSON.parse(cached as string)).toEqual([{ id: category.id, name: "Medicamentos", description: null }]);
            expect(context.cache.getTtl(CATEGORIES_ALL_CACHE_KEY)).toBe(CATEGORIES_CACHE_TTL_SECONDS);
        });

        it("devolve o conteúdo do cache sem tocar o repositório quando o cache já está populado", async () => {
            const cachedOutput = [{ id: "category-cache-only", name: "Só existe no cache", description: null }];
            await context.cache.set(CATEGORIES_ALL_CACHE_KEY, JSON.stringify(cachedOutput), CATEGORIES_CACHE_TTL_SECONDS);
            const category = Category.build(createId, "Medicamentos", null);
            await context.repository.save(category);

            const output = await context.useCase.execute();

            expect(output).toEqual(cachedOutput);
        });
    });
});
