export const PRODUCT_IMAGES_CACHE_TTL_SECONDS = 5 * 60;

export function productImagesCacheKey(productId: string): string {
    return `product-images:${productId}`;
}
