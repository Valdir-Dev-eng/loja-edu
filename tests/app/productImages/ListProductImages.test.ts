import { beforeEach, describe, expect, it } from "vitest";
import { ListProductImages } from "../../../src/app/productImages/useCase/ListProductImages";
import { ProductImage } from "../../../src/domain/entites/ProductImage";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `image-id-${++sequence}`;

const buildUseCase = () => {
    const imageRepo = new InMemoryRepository<ProductImage>();
    const useCase = new ListProductImages(imageRepo);
    return { useCase, imageRepo };
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
});
