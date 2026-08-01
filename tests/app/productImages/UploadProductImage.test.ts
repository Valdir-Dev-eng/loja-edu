import { beforeEach, describe, expect, it } from "vitest";
import { UploadProductImage } from "../../../src/app/productImages/useCase/UploadProductImage";
import { Product } from "../../../src/domain/entites/Product";
import { ProductImage } from "../../../src/domain/entites/ProductImage";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeImageStorageGatewayPort } from "../../doubles/FakeImageStorageGatewayPort";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF_BYTES = Buffer.from("%PDF-1.4", "latin1");

const buildUseCase = () => {
    const productRepo = new InMemoryRepository<Product>();
    const imageRepo = new InMemoryRepository<ProductImage>();
    const imageStorage = new FakeImageStorageGatewayPort();
    const useCase = new UploadProductImage(productRepo, imageRepo, imageStorage, createId);
    return { useCase, productRepo, imageRepo, imageStorage };
};

const buildProduct = async (context: ReturnType<typeof buildUseCase>) => {
    const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
    await context.productRepo.save(product);
    return product;
};

describe("UploadProductImage", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("envia a imagem para o storage e salva a referência com ordem 0 na primeira imagem", async () => {
        const product = await buildProduct(context);

        const output = await context.useCase.execute({
            productId: product.id,
            bytes: JPEG_BYTES,
            filename: "caixa.jpg",
            altText: "Caixa do remédio",
        });

        expect(output.order).toBe(0);
        expect(output.altText).toBe("Caixa do remédio");
        expect(context.imageStorage.uploadedFiles).toHaveLength(1);
        expect(context.imageStorage.uploadedFiles[0].contentType).toBe("image/jpeg");
    });

    it("incrementa a ordem a cada nova imagem do mesmo produto", async () => {
        const product = await buildProduct(context);
        await context.useCase.execute({ productId: product.id, bytes: JPEG_BYTES, filename: "a.jpg", altText: null });

        const second = await context.useCase.execute({
            productId: product.id,
            bytes: JPEG_BYTES,
            filename: "b.jpg",
            altText: null,
        });

        expect(second.order).toBe(1);
    });

    it("recusa upload para produto inexistente", async () => {
        await expect(
            context.useCase.execute({ productId: "id-inexistente", bytes: JPEG_BYTES, filename: "a.jpg", altText: null })
        ).rejects.toThrow(NotFoundError);
    });

    it("recusa exceder o limite de 6 imagens por produto", async () => {
        const product = await buildProduct(context);
        for (let i = 0; i < 6; i++) {
            await context.useCase.execute({ productId: product.id, bytes: JPEG_BYTES, filename: `${i}.jpg`, altText: null });
        }

        await expect(
            context.useCase.execute({ productId: product.id, bytes: JPEG_BYTES, filename: "7.jpg", altText: null })
        ).rejects.toThrow(BusinessRuleError);
        await expect(
            context.useCase.execute({ productId: product.id, bytes: JPEG_BYTES, filename: "7.jpg", altText: null })
        ).rejects.toThrow("Um produto pode ter no máximo 6 imagens.");
    });

    it("recusa arquivo que não é uma imagem de verdade, mesmo com nome de imagem", async () => {
        const product = await buildProduct(context);

        await expect(
            context.useCase.execute({ productId: product.id, bytes: PDF_BYTES, filename: "fake.jpg", altText: null })
        ).rejects.toThrow(BusinessRuleError);
        await expect(
            context.useCase.execute({ productId: product.id, bytes: PDF_BYTES, filename: "fake.jpg", altText: null })
        ).rejects.toThrow("Arquivo enviado não é uma imagem válida.");
        expect(context.imageStorage.uploadedFiles).toHaveLength(0);
    });
});
