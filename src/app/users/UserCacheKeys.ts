export const USER_CACHE_TTL_SECONDS = 60;

export function userByIdCacheKey(id: string): string {
    return `users:id:${id}`;
}
