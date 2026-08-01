import { describe, expect, it } from "vitest";
import { ProductImage } from "../../../src/domain/entites/ProductImage";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const createId = () => "image-id-1";

describe("ProductImage", () => {
    describe("build", () => {
        it("cria a imagem com URL, ordem e texto alternativo", () => {
            const image = ProductImage.build(createId, "product-1", "https://demo.sirv.com/products/a.jpg", 0, "Caixa do remédio");

            expect(image.id).toBe("image-id-1");
            expect(image.productId).toBe("product-1");
            expect(image.url).toBe("https://demo.sirv.com/products/a.jpg");
            expect(image.order).toBe(0);
            expect(image.altText).toBe("Caixa do remédio");
        });

        it("aceita imagem sem texto alternativo", () => {
            const image = ProductImage.build(createId, "product-1", "https://demo.sirv.com/products/a.jpg", 0, null);

            expect(image.altText).toBeNull();
        });

        it("recusa URL vazia", () => {
            expect(() => ProductImage.build(createId, "product-1", "", 0, null)).toThrow(BusinessRuleError);
            expect(() => ProductImage.build(createId, "product-1", "", 0, null)).toThrow(
                "URL da imagem é obrigatória."
            );
        });

        it("recusa ordem negativa", () => {
            expect(() =>
                ProductImage.build(createId, "product-1", "https://demo.sirv.com/products/a.jpg", -1, null)
            ).toThrow("Ordem da imagem inválida.");
        });

        it("recusa ordem não inteira", () => {
            expect(() =>
                ProductImage.build(createId, "product-1", "https://demo.sirv.com/products/a.jpg", 1.5, null)
            ).toThrow("Ordem da imagem inválida.");
        });
    });

    describe("softDelete", () => {
        it("marca a imagem como deletada", () => {
            const image = ProductImage.build(createId, "product-1", "https://demo.sirv.com/products/a.jpg", 0, null);

            image.softDelete();

            expect(image.deleted_at).not.toBeNull();
        });

        it("recusa deletar uma imagem já deletada", () => {
            const image = ProductImage.build(createId, "product-1", "https://demo.sirv.com/products/a.jpg", 0, null);
            image.softDelete();

            expect(() => image.softDelete()).toThrow(ConflictError);
            expect(() => image.softDelete()).toThrow("Imagem já está deletada.");
        });
    });
});
