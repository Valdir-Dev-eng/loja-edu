export const PRODUCTS_ALL_CACHE_KEY = "products:all";
export const PRODUCTS_CACHE_TTL_SECONDS = 5 * 60;

export function productByIdCacheKey(id: string): string {
    return `products:id:${id}`;
}
