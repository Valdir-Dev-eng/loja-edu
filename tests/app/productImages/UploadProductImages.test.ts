import { beforeEach, describe, expect, it } from "vitest";
import { UploadProductImages } from "../../../src/app/productImages/useCase/UploadProductImages";
import { ListProductImages } from "../../../src/app/productImages/useCase/ListProductImages";
import { productImagesCacheKey } from "../../../src/app/productImages/ProductImageCacheKeys";
import { Product } from "../../../src/domain/entites/Product";
import { ProductImage } from "../../../src/domain/entites/ProductImage";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeImageStorageGatewayPort } from "../../doubles/FakeImageStorageGatewayPort";
import { FakeCachePort } from "../../doubles/FakeCachePort";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF_BYTES = Buffer.from("%PDF-1.4", "latin1");

const buildUseCase = () => {
    const productRepo = new InMemoryRepository<Product>();
    const imageRepo = new InMemoryRepository<ProductImage>();
    const imageStorage = new FakeImageStorageGatewayPort();
    const cache = new FakeCachePort();
    const useCase = new UploadProductImages(productRepo, imageRepo, imageStorage, cache, createId);
    const listUseCase = new ListProductImages(imageRepo, cache);
    return { useCase, listUseCase, productRepo, imageRepo, imageStorage, cache };
};

const buildProduct = async (context: ReturnType<typeof buildUseCase>) => {
    const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
    await context.productRepo.save(product);
    return product;
};

const file = (filename: string, altText: string | null = null) => ({ bytes: JPEG_BYTES, filename, altText });

describe("UploadProductImages", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("envia uma única imagem e salva com ordem 0", async () => {
        const product = await buildProduct(context);

        const output = await context.useCase.execute({
            productId: product.id,
            files: [file("caixa.jpg", "Caixa do remédio")],
        });

        expect(output).toHaveLength(1);
        expect(output[0].order).toBe(0);
        expect(output[0].altText).toBe("Caixa do remédio");
        expect(context.imageStorage.uploadedFiles).toHaveLength(1);
        expect(context.imageStorage.uploadedFiles[0].contentType).toBe("image/jpeg");
    });

    it("envia várias imagens em um único lote e atribui ordens sequenciais", async () => {
        const product = await buildProduct(context);

        const output = await context.useCase.execute({
            productId: product.id,
            files: [file("frente.jpg", "Frente"), file("verso.jpg", "Verso"), file("lateral.jpg", "Lateral")],
        });

        expect(output.map((image) => image.order)).toEqual([0, 1, 2]);
        expect(output.map((image) => image.altText)).toEqual(["Frente", "Verso", "Lateral"]);
        expect(context.imageStorage.uploadedFiles).toHaveLength(3);
    });

    it("continua a numeração de ordem a partir das imagens já existentes", async () => {
        const product = await buildProduct(context);
        await context.useCase.execute({ productId: product.id, files: [file("a.jpg")] });

        const output = await context.useCase.execute({
            productId: product.id,
            files: [file("b.jpg"), file("c.jpg")],
        });

        expect(output.map((image) => image.order)).toEqual([1, 2]);
    });

    it("as imagens de um lote são retornadas pela listagem na mesma ordem em que foram enviadas", async () => {
        const product = await buildProduct(context);
        await context.useCase.execute({
            productId: product.id,
            files: [file("frente.jpg"), file("verso.jpg"), file("lateral.jpg")],
        });

        const listed = await context.listUseCase.execute(product.id);

        expect(listed).toHaveLength(3);
        expect(listed.map((image) => image.url)).toEqual(
            context.imageStorage.uploadedFiles.map((uploaded) => `https://fake.sirv.com${uploaded.filename}`)
        );
        expect(listed.map((image) => image.order)).toEqual([0, 1, 2]);
    });

    it("recusa upload para produto inexistente", async () => {
        await expect(
            context.useCase.execute({ productId: "id-inexistente", files: [file("a.jpg")] })
        ).rejects.toThrow(NotFoundError);
    });

    it("recusa lote vazio", async () => {
        const product = await buildProduct(context);

        await expect(context.useCase.execute({ productId: product.id, files: [] })).rejects.toThrow(BusinessRuleError);
        await expect(context.useCase.execute({ productId: product.id, files: [] })).rejects.toThrow(
            "Nenhum arquivo enviado."
        );
    });

    it("recusa exceder o limite de 6 imagens por produto ao enviar uma a uma", async () => {
        const product = await buildProduct(context);
        for (let i = 0; i < 6; i++) {
            await context.useCase.execute({ productId: product.id, files: [file(`${i}.jpg`)] });
        }

        await expect(context.useCase.execute({ productId: product.id, files: [file("7.jpg")] })).rejects.toThrow(
            BusinessRuleError
        );
        await expect(context.useCase.execute({ productId: product.id, files: [file("7.jpg")] })).rejects.toThrow(
            "Um produto pode ter no máximo 6 imagens."
        );
    });

    it("recusa o lote inteiro quando ele ultrapassa o limite de 6 imagens, mesmo que alguns arquivos coubessem", async () => {
        const product = await buildProduct(context);
        await context.useCase.execute({
            productId: product.id,
            files: [file("1.jpg"), file("2.jpg"), file("3.jpg"), file("4.jpg")],
        });

        await expect(
            context.useCase.execute({ productId: product.id, files: [file("5.jpg"), file("6.jpg"), file("7.jpg")] })
        ).rejects.toThrow("Um produto pode ter no máximo 6 imagens.");

        const listed = await context.listUseCase.execute(product.id);
        expect(listed).toHaveLength(4);
    });

    it("recusa o lote inteiro se qualquer arquivo não for uma imagem de verdade, sem enviar nenhum ao storage", async () => {
        const product = await buildProduct(context);

        await expect(
            context.useCase.execute({
                productId: product.id,
                files: [file("real.jpg"), { bytes: PDF_BYTES, filename: "fake.jpg", altText: null }],
            })
        ).rejects.toThrow('Arquivo "fake.jpg" não é uma imagem válida.');

        expect(context.imageStorage.uploadedFiles).toHaveLength(0);
        const listed = await context.listUseCase.execute(product.id);
        expect(listed).toHaveLength(0);
    });

    it("invalida o cache de imagens do produto ao enviar um novo lote", async () => {
        const product = await buildProduct(context);
        await context.cache.set(productImagesCacheKey(product.id), JSON.stringify([{ stale: true }]), 300);

        await context.useCase.execute({ productId: product.id, files: [file("a.jpg")] });

        expect(await context.cache.get(productImagesCacheKey(product.id))).toBeNull();
    });
});
