import { CachePort } from "../../../domain/database/CachePort";
import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { Money } from "../../../domain/money/Money";
import { RateLimitExceededError } from "../../../domain/rateLimit/RateLimitExceededError";
import { RateLimiterPort } from "../../../domain/rateLimit/RateLimiterPort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ShippingGatewayPort, ShippingQuoteRequestItem } from "../../../domain/shipping/ShippingGatewayPort";
import { SHIPPING_QUOTE_GATEWAY } from "../../../infra/rateLimit/RateLimitRouteRules";
import { CalculateShippingInput } from "../dto/CalculateShippingInput";
import { CalculateShippingOutput } from "../dto/CalculateShippingOutput";
import { SHIPPING_QUOTE_CACHE_TTL_SECONDS, shippingQuoteCacheKey } from "../ShippingCacheKeys";

const RATE_LIMIT_KEY_PREFIX = "shipping-quote-gateway";

export class CalculateShipping {
    constructor(
        private productRepo: RepositoryPort<Product>,
        private shippingGateway: ShippingGatewayPort,
        private cache: CachePort,
        private rateLimiter: RateLimiterPort
    ) {}

    // clientKey so importa em cache MISS (ver comentario no rate limit
    // desativado pra essa rota em RateLimitRouteRules.ts) — pedir a mesma
    // combinacao de CEP+carrinho de novo dentro do TTL nunca chega aqui.
    async execute(input: CalculateShippingInput, clientKey: string): Promise<CalculateShippingOutput> {
        const cacheKey = shippingQuoteCacheKey(input);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as CalculateShippingOutput;
        }

        const decision = await this.rateLimiter.consume(`${RATE_LIMIT_KEY_PREFIX}:${clientKey}`, SHIPPING_QUOTE_GATEWAY);
        if (!decision.allowed) {
            throw new RateLimitExceededError(decision.retryAfterMs);
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
