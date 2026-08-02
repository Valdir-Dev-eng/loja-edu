import { CachePort } from "../../../domain/database/CachePort";
import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { Money } from "../../../domain/money/Money";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ShippingGatewayPort, ShippingQuoteRequestItem } from "../../../domain/shipping/ShippingGatewayPort";
import { CalculateShippingInput } from "../dto/CalculateShippingInput";
import { CalculateShippingOutput } from "../dto/CalculateShippingOutput";
import { SHIPPING_QUOTE_CACHE_TTL_SECONDS, shippingQuoteCacheKey } from "../ShippingCacheKeys";

export class CalculateShipping {
    constructor(
        private productRepo: RepositoryPort<Product>,
        private shippingGateway: ShippingGatewayPort,
        private cache: CachePort
    ) {}

    async execute(input: CalculateShippingInput): Promise<CalculateShippingOutput> {
        const cacheKey = shippingQuoteCacheKey(input);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as CalculateShippingOutput;
        }

        const items = await this.buildQuoteItems(input.items);
        const options = await this.shippingGateway.quote({
            destinationPostalCode: input.destinationPostalCode,
            items,
        });

        const output = options.map((option) => ({
            serviceId: option.serviceId,
            carrierName: option.carrierName,
            priceCents: option.priceCents,
            priceDisplay: Money.toDisplay(option.priceCents),
            deliveryTimeDays: option.deliveryTimeDays,
        }));

        await this.cache.set(cacheKey, JSON.stringify(output), SHIPPING_QUOTE_CACHE_TTL_SECONDS);
        return output;
    }

    private async buildQuoteItems(requested: CalculateShippingInput["items"]): Promise<ShippingQuoteRequestItem[]> {
        const items: ShippingQuoteRequestItem[] = [];
        for (const requestedItem of requested) {
            const product = await this.productRepo.findById(requestedItem.productId);
            if (!product) {
                throw new NotFoundError(`Produto ${requestedItem.productId} não encontrado.`);
            }
            items.push({
                weightKg: product.weight,
                widthCm: product.width,
                heightCm: product.height,
                lengthCm: product.length,
                insuranceValueCents: product.priceCents,
                quantity: requestedItem.quantity,
            });
        }
        return items;
    }
}
