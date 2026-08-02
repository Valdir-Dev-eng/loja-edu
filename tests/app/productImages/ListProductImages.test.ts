import { beforeEach, describe, expect, it } from "vitest";
import { ListProductImages } from "../../../src/app/productImages/useCase/ListProductImages";
import { PRODUCT_IMAGES_CACHE_TTL_SECONDS, productImagesCacheKey } from "../../../src/app/productImages/ProductImageCacheKeys";
import { ProductImage } from "../../../src/domain/entites/ProductImage";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

let sequence = 0;
const createId = () => `image-id-${++sequence}`;

const buildUseCase = () => {
    const imageRepo = new InMemoryRepository<ProductImage>();
    const cache = new FakeCachePort();
    const useCase = new ListProductImages(imageRepo, cache);
    return { useCase, imageRepo, cache };
};

describe("ListProductImages", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("lista as imagens do produto ordenadas por ordem, mesmo se salvas fora de ordem", async () => {
        const second = ProductImage.build(createId, "product-1", "https://fake.sirv.com/b.jpg", 1, null);
        const first = ProductImage.build(createId, "product-1", "https://fake.sirv.com/a.jpg", 0, null);
        await context.imageRepo.save(second);
        await context.imageRepo.save(first);

        const output = await context.useCase.execute("product-1");

        expect(output.map((image) => image.url)).toEqual([
            "https://fake.sirv.com/a.jpg",
            "https://fake.sirv.com/b.jpg",
        ]);
    });

    it("retorna lista vazia quando o produto não tem imagens", async () => {
        const output = await context.useCase.execute("product-sem-imagens");

        expect(output).toEqual([]);
    });

    it("não lista imagens de outro produto", async () => {
        const image = ProductImage.build(createId, "product-2", "https://fake.sirv.com/c.jpg", 0, null);
        await context.imageRepo.save(image);

        const output = await context.useCase.execute("product-1");

        expect(output).toEqual([]);
    });

    describe("cache-aside", () => {
        it("grava no cache com o TTL de segurança quando o cache está vazio", async () => {
            const image = ProductImage.build(createId, "product-1", "https://fake.sirv.com/a.jpg", 0, null);
            await context.imageRepo.save(image);

            await context.useCase.execute("product-1");

            const cacheKey = productImagesCacheKey("product-1");
            const cached = await context.cache.get(cacheKey);
            expect(cached).not.toBeNull();
            expect(JSON.parse(cached as string)).toHaveLength(1);
            expect(context.cache.getTtl(cacheKey)).toBe(PRODUCT_IMAGES_CACHE_TTL_SECONDS);
        });

        it("devolve o conteúdo do cache sem tocar o repositório quando o cache já está populado", async () => {
            const cachedOutput = [
                {
                    id: "cache-only",
                    productId: "product-1",
                    url: "https://fake.sirv.com/cache-only.jpg",
                    order: 0,
                    altText: null,
                },
            ];
            await context.cache.set(
                productImagesCacheKey("product-1"),
                JSON.stringify(cachedOutput),
                PRODUCT_IMAGES_CACHE_TTL_SECONDS
            );

            const output = await context.useCase.execute("product-1");

            expect(output).toEqual(cachedOutput);
        });
    });
});
