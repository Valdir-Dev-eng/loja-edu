import { beforeEach, describe, expect, it } from "vitest";
import { CalculateShipping } from "../../../src/app/shipping/useCase/CalculateShipping";
import { SHIPPING_QUOTE_CACHE_TTL_SECONDS } from "../../../src/app/shipping/ShippingCacheKeys";
import { Product } from "../../../src/domain/entites/Product";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeShippingGatewayPort } from "../../doubles/FakeShippingGatewayPort";
import { FakeCachePort } from "../../doubles/FakeCachePort";

let sequence = 0;
const createId = () => `product-id-${++sequence}`;

const buildUseCase = () => {
    const productRepo = new InMemoryRepository<Product>();
    const shippingGateway = new FakeShippingGatewayPort();
    const cache = new FakeCachePort();
    const useCase = new CalculateShipping(productRepo, shippingGateway, cache);
    return { useCase, productRepo, shippingGateway, cache };
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

    it("reutiliza o resultado em cache para o mesmo CEP e carrinho, sem chamar o gateway pago de novo", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
        await context.productRepo.save(product);
        context.shippingGateway.queueQuoteOptions([
            { serviceId: 1, carrierName: "PAC", priceCents: 1500, deliveryTimeDays: 7 },
        ]);

        const quoteInput = { destinationPostalCode: "01310100", items: [{ productId: product.id, quantity: 2 }] };
        const first = await context.useCase.execute(quoteInput);
        const second = await context.useCase.execute(quoteInput);

        expect(second).toEqual(first);
        expect(context.shippingGateway.quoteCallCount).toBe(1);
    });

    it("guarda o resultado em cache com o TTL de cotação de frete", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
        await context.productRepo.save(product);
        context.shippingGateway.queueQuoteOptions([
            { serviceId: 1, carrierName: "PAC", priceCents: 1500, deliveryTimeDays: 7 },
        ]);

        await context.useCase.execute({ destinationPostalCode: "01310100", items: [{ productId: product.id, quantity: 1 }] });

        const cacheKey = `shipping-quote:01310100:${product.id}:1`;
        expect(context.cache.has(cacheKey)).toBe(true);
        expect(context.cache.getTtl(cacheKey)).toBe(SHIPPING_QUOTE_CACHE_TTL_SECONDS);
    });

    it("não reaproveita o cache quando o CEP de destino muda", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
        await context.productRepo.save(product);
        context.shippingGateway.queueQuoteOptions([
            { serviceId: 1, carrierName: "PAC", priceCents: 1500, deliveryTimeDays: 7 },
        ]);

        await context.useCase.execute({ destinationPostalCode: "01310100", items: [{ productId: product.id, quantity: 1 }] });
        await context.useCase.execute({ destinationPostalCode: "20000000", items: [{ productId: product.id, quantity: 1 }] });

        expect(context.shippingGateway.quoteCallCount).toBe(2);
    });

    it("não reaproveita o cache quando o carrinho (itens/quantidades) muda", async () => {
        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
        await context.productRepo.save(product);
        context.shippingGateway.queueQuoteOptions([
            { serviceId: 1, carrierName: "PAC", priceCents: 1500, deliveryTimeDays: 7 },
        ]);

        await context.useCase.execute({ destinationPostalCode: "01310100", items: [{ productId: product.id, quantity: 1 }] });
        await context.useCase.execute({ destinationPostalCode: "01310100", items: [{ productId: product.id, quantity: 2 }] });

        expect(context.shippingGateway.quoteCallCount).toBe(2);
    });

    it("acerta o mesmo cache independente da ordem dos itens no carrinho", async () => {
        const productA = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
        const productB = Product.build(createId, "Vitamina C", 2450, null, 10, 0.1, 4, 4, 8, null);
        await context.productRepo.save(productA);
        await context.productRepo.save(productB);
        context.shippingGateway.queueQuoteOptions([
            { serviceId: 1, carrierName: "PAC", priceCents: 1500, deliveryTimeDays: 7 },
        ]);

        await context.useCase.execute({
            destinationPostalCode: "01310100",
            items: [
                { productId: productA.id, quantity: 1 },
                { productId: productB.id, quantity: 1 },
            ],
        });
        await context.useCase.execute({
            destinationPostalCode: "01310100",
            items: [
                { productId: productB.id, quantity: 1 },
                { productId: productA.id, quantity: 1 },
            ],
        });

        expect(context.shippingGateway.quoteCallCount).toBe(1);
    });

    it("não coloca em cache uma cotação que falhou por produto inexistente", async () => {
        await expect(
            context.useCase.execute({ destinationPostalCode: "01310100", items: [{ productId: "id-inexistente", quantity: 1 }] })
        ).rejects.toThrow(NotFoundError);

        const cacheKey = "shipping-quote:01310100:id-inexistente:1";
        expect(context.cache.has(cacheKey)).toBe(false);
    });
});
