export const PRODUCTS_ALL_CACHE_KEY = "products:all";
// Writes (create/update/delete) already bust this key immediately via cache.del, so the
// TTL only matters as a fallback safety net — raising it just makes the cache-miss
// stampede window (all concurrent readers missing at once) happen less often.
export const PRODUCTS_CACHE_TTL_SECONDS = 15 * 60;

export function productByIdCacheKey(id: string): string {
    return `products:id:${id}`;
}
