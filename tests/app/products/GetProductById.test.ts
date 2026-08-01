import { beforeEach, describe, expect, it } from "vitest";
import { GetProductById } from "../../../src/app/products/useCase/GetProductById";
import { Product } from "../../../src/domain/entites/Product";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const createId = () => "product-id-1";

const buildUseCase = () => {
    const repository = new InMemoryRepository<Product>();
    const useCase = new GetProductById(repository);
    return { useCase, repository };
};

describe("GetProductById", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("retorna o produto no formato de Output", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await context.repository.save(product);

        const output = await context.useCase.execute(product.id);

        expect(output).toEqual({
            id: product.id,
            name: "Dipirona",
            priceCents: 1990,
            discountCents: null,
            stock: 10,
            weight: 0.1,
            width: 5,
            height: 5,
            length: 10,
            categoryId: null,
        });
    });

    it("não expõe campos internos da entidade no Output", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        product.softDelete();
        await context.repository.save(product);

        const output = await context.useCase.execute(product.id);

        expect(output).not.toHaveProperty("deleted_at");
        expect(output).not.toHaveProperty("created_at");
        expect(output).not.toHaveProperty("updated_at");
    });

    it("recusa buscar produto inexistente", async () => {
        await expect(context.useCase.execute("id-inexistente")).rejects.toThrow(NotFoundError);
        await expect(context.useCase.execute("id-inexistente")).rejects.toThrow("Produto não encontrado.");
    });
});
