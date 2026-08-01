import { beforeEach, describe, expect, it } from "vitest";
import { CalculateShipping } from "../../../src/app/shipping/useCase/CalculateShipping";
import { Product } from "../../../src/domain/entites/Product";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeShippingGatewayPort } from "../../doubles/FakeShippingGatewayPort";

let sequence = 0;
const createId = () => `product-id-${++sequence}`;

const buildUseCase = () => {
    const productRepo = new InMemoryRepository<Product>();
    const shippingGateway = new FakeShippingGatewayPort();
    const useCase = new CalculateShipping(productRepo, shippingGateway);
    return { useCase, productRepo, shippingGateway };
};

describe("CalculateShipping", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cota o frete com peso/dimensão real do produto e devolve as opções formatadas", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
        await context.productRepo.save(product);
        context.shippingGateway.queueQuoteOptions([
            { serviceId: 1, carrierName: "PAC", priceCents: 1500, deliveryTimeDays: 7 },
            { serviceId: 2, carrierName: "SEDEX", priceCents: 3000, deliveryTimeDays: 2 },
        ]);

        const output = await context.useCase.execute({
            destinationPostalCode: "01310100",
            items: [{ productId: product.id, quantity: 2 }],
        });

        expect(output).toEqual([
            { serviceId: 1, carrierName: "PAC", priceCents: 1500, priceDisplay: "R$ 15,00", deliveryTimeDays: 7 },
            { serviceId: 2, carrierName: "SEDEX", priceCents: 3000, priceDisplay: "R$ 30,00", deliveryTimeDays: 2 },
        ]);
        expect(context.shippingGateway.lastQuoteInput).toEqual({
            destinationPostalCode: "01310100",
            items: [{ weightKg: 0.2, widthCm: 5, heightCm: 5, lengthCm: 10, insuranceValueCents: 1990, quantity: 2 }],
        });
    });

    it("recusa cotar frete de produto inexistente", async () => {
        await expect(
            context.useCase.execute({ destinationPostalCode: "01310100", items: [{ productId: "id-inexistente", quantity: 1 }] })
        ).rejects.toThrow(NotFoundError);
    });

    it("devolve lista vazia quando o gateway não retorna nenhuma opção comprável", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
        await context.productRepo.save(product);
        context.shippingGateway.queueQuoteOptions([]);

        const output = await context.useCase.execute({
            destinationPostalCode: "01310100",
            items: [{ productId: product.id, quantity: 1 }],
        });

        expect(output).toEqual([]);
    });
});
