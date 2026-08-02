import { CalculateShippingInput } from "./dto/CalculateShippingInput";

export const SHIPPING_QUOTE_CACHE_TTL_SECONDS = 5 * 60;

export function shippingQuoteCacheKey(input: CalculateShippingInput): string {
    const normalizedItems = input.items
        .slice()
        .sort((first, second) => first.productId.localeCompare(second.productId))
        .map((item) => `${item.productId}:${item.quantity}`)
        .join(",");
    return `shipping-quote:${input.destinationPostalCode}:${normalizedItems}`;
}
