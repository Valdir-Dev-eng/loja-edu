import { beforeEach, describe, expect, it } from "vitest";
import { DeleteProductImage } from "../../../src/app/productImages/useCase/DeleteProductImage";
import { productImagesCacheKey } from "../../../src/app/productImages/ProductImageCacheKeys";
import { ProductImage } from "../../../src/domain/entites/ProductImage";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeImageStorageGatewayPort } from "../../doubles/FakeImageStorageGatewayPort";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const createId = () => "image-id-1";

const buildUseCase = () => {
    const imageRepo = new InMemoryRepository<ProductImage>();
    const imageStorage = new FakeImageStorageGatewayPort();
    const cache = new FakeCachePort();
    const useCase = new DeleteProductImage(imageRepo, imageStorage, cache);
    return { useCase, imageRepo, imageStorage, cache };
};

describe("DeleteProductImage", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("remove a imagem do storage e marca como deletada", async () => {
        const image = ProductImage.build(createId, "product-1", "https://fake.sirv.com/products/a.jpg", 0, null);
        await context.imageRepo.save(image);

        await context.useCase.execute({ productId: "product-1", imageId: image.id });

        expect(context.imageStorage.removedUrls).toEqual(["https://fake.sirv.com/products/a.jpg"]);
        const persisted = await context.imageRepo.findById(image.id);
        expect(persisted?.deleted_at).not.toBeNull();
    });

    it("recusa remover imagem inexistente", async () => {
        await expect(context.useCase.execute({ productId: "product-1", imageId: "id-inexistente" })).rejects.toThrow(
            NotFoundError
        );
        await expect(context.useCase.execute({ productId: "product-1", imageId: "id-inexistente" })).rejects.toThrow(
            "Imagem não encontrada."
        );
    });

    it("recusa remover imagem que pertence a outro produto (nunca revela que existe)", async () => {
        const image = ProductImage.build(createId, "product-1", "https://fake.sirv.com/products/a.jpg", 0, null);
        await context.imageRepo.save(image);

        await expect(context.useCase.execute({ productId: "product-2", imageId: image.id })).rejects.toThrow(
            NotFoundError
        );
        expect(context.imageStorage.removedUrls).toHaveLength(0);
    });

    it("invalida o cache de imagens do produto ao remover uma imagem", async () => {
        const image = ProductImage.build(createId, "product-1", "https://fake.sirv.com/products/a.jpg", 0, null);
        await context.imageRepo.save(image);
        await context.cache.set(productImagesCacheKey("product-1"), JSON.stringify([{ stale: true }]), 300);

        await context.useCase.execute({ productId: "product-1", imageId: image.id });

        expect(await context.cache.get(productImagesCacheKey("product-1"))).toBeNull();
    });
});
