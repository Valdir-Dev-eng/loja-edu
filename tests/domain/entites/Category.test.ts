import { describe, expect, it } from "vitest";
import { Category } from "../../../src/domain/entites/Category";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const createId = () => "category-id-1";

describe("Category", () => {
    describe("build", () => {
        it("cria a categoria com nome e descrição", () => {
            const category = Category.build(createId, "Medicamentos", "Itens de uso contínuo");

            expect(category.id).toBe("category-id-1");
            expect(category.name).toBe("Medicamentos");
            expect(category.description).toBe("Itens de uso contínuo");
        });

        it("aceita categoria sem descrição", () => {
            const category = Category.build(createId, "Medicamentos", null);

            expect(category.description).toBeNull();
        });

        it("recusa nome vazio", () => {
            expect(() => Category.build(createId, "   ", null)).toThrow(BusinessRuleError);
            expect(() => Category.build(createId, "   ", null)).toThrow("Nome da categoria é obrigatório.");
        });
    });

    describe("softDelete", () => {
        it("marca a categoria como deletada", () => {
            const category = Category.build(createId, "Medicamentos", null);

            category.softDelete();

            expect(category.deleted_at).not.toBeNull();
        });

        it("recusa deletar uma categoria já deletada", () => {
            const category = Category.build(createId, "Medicamentos", null);
            category.softDelete();

            expect(() => category.softDelete()).toThrow(ConflictError);
            expect(() => category.softDelete()).toThrow("Categoria já está deletada.");
        });
    });
});
