import { describe, expect, it } from "vitest";
import { Product } from "../../../src/domain/entites/Product";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const createId = () => "product-id-1";

const buildValidProduct = (overrides: Partial<{
    name: string;
    priceCents: number;
    discountCents: number | null;
    stock: number;
    weight: number;
    width: number;
    height: number;
    length: number;
    categoryId: string | null;
}> = {}) =>
    Product.build(
        createId,
        overrides.name ?? "Dipirona",
        overrides.priceCents ?? 1990,
        "discountCents" in overrides ? overrides.discountCents ?? null : null,
        overrides.stock ?? 10,
        overrides.weight ?? 0.1,
        overrides.width ?? 5,
        overrides.height ?? 5,
        overrides.length ?? 10,
        "categoryId" in overrides ? overrides.categoryId ?? null : null
    );

describe("Product", () => {
    describe("build", () => {
        it("cria o produto com peso e dimensões informados", () => {
            const product = buildValidProduct();

            expect(product.id).toBe("product-id-1");
            expect(product.priceCents).toBe(1990);
            expect(product.weight).toBe(0.1);
            expect(product.width).toBe(5);
            expect(product.height).toBe(5);
            expect(product.length).toBe(10);
            expect(product.categoryId).toBeNull();
        });

        it("aceita produto vinculado a uma categoria", () => {
            const product = buildValidProduct({ categoryId: "category-1" });

            expect(product.categoryId).toBe("category-1");
        });

        it("recusa peso ausente (zero)", () => {
            expect(() => buildValidProduct({ weight: 0 })).toThrow(BusinessRuleError);
            expect(() => buildValidProduct({ weight: 0 })).toThrow("Peso do produto deve ser maior que zero.");
        });

        it("recusa peso negativo", () => {
            expect(() => buildValidProduct({ weight: -1 })).toThrow(BusinessRuleError);
        });

        it("recusa largura inválida", () => {
            expect(() => buildValidProduct({ width: 0 })).toThrow("Largura do produto deve ser maior que zero.");
        });

        it("recusa altura inválida", () => {
            expect(() => buildValidProduct({ height: 0 })).toThrow("Altura do produto deve ser maior que zero.");
        });

        it("recusa comprimento inválido", () => {
            expect(() => buildValidProduct({ length: 0 })).toThrow("Comprimento do produto deve ser maior que zero.");
        });
    });

    describe("updateFields", () => {
        it("atualiza peso e dimensões quando informados", () => {
            const product = buildValidProduct();

            product.updateFields({ weight: 0.2, width: 6, height: 6, length: 12 });

            expect(product.weight).toBe(0.2);
            expect(product.width).toBe(6);
            expect(product.height).toBe(6);
            expect(product.length).toBe(12);
        });

        it("recusa atualizar peso para um valor inválido", () => {
            const product = buildValidProduct();

            expect(() => product.updateFields({ weight: 0 })).toThrow(BusinessRuleError);
            expect(() => product.updateFields({ weight: 0 })).toThrow("Peso do produto deve ser maior que zero.");
        });

        it("recusa atualizar largura para um valor inválido", () => {
            const product = buildValidProduct();

            expect(() => product.updateFields({ width: -1 })).toThrow("Largura do produto deve ser maior que zero.");
        });

        it("recusa atualizar altura para um valor inválido", () => {
            const product = buildValidProduct();

            expect(() => product.updateFields({ height: 0 })).toThrow("Altura do produto deve ser maior que zero.");
        });

        it("recusa atualizar comprimento para um valor inválido", () => {
            const product = buildValidProduct();

            expect(() => product.updateFields({ length: 0 })).toThrow(
                "Comprimento do produto deve ser maior que zero."
            );
        });

        it("não altera peso e dimensões quando a atualização de um campo inválido é recusada", () => {
            const product = buildValidProduct();

            expect(() => product.updateFields({ height: 0 })).toThrow(BusinessRuleError);

            expect(product.height).toBe(5);
        });

        it("atualiza a categoria vinculada ao produto", () => {
            const product = buildValidProduct();

            product.updateFields({ categoryId: "category-2" });

            expect(product.categoryId).toBe("category-2");
        });

        it("remove a categoria vinculada quando atualizada para null", () => {
            const product = buildValidProduct({ categoryId: "category-1" });

            product.updateFields({ categoryId: null });

            expect(product.categoryId).toBeNull();
        });

        it("atualiza preço e desconto em centavos", () => {
            const product = buildValidProduct();

            product.updateFields({ priceCents: 2500, discountCents: 300 });

            expect(product.priceCents).toBe(2500);
            expect(product.discountCents).toBe(300);
        });

        it("mantém peso e dimensões inalterados quando não informados", () => {
            const product = buildValidProduct();

            product.updateFields({ stock: 3 });

            expect(product.weight).toBe(0.1);
            expect(product.stock).toBe(3);
        });
    });

    describe("softDelete", () => {
        it("marca o produto como deletado", () => {
            const product = buildValidProduct();

            product.softDelete();

            expect(product.deleted_at).not.toBeNull();
        });

        it("recusa deletar um produto já deletado", () => {
            const product = buildValidProduct();
            product.softDelete();

            expect(() => product.softDelete()).toThrow(ConflictError);
            expect(() => product.softDelete()).toThrow("Produto já está deletado.");
        });
    });
});
