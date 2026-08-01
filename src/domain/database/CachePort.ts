export abstract class CachePort {
    abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;
    abstract get(key: string): Promise<string | null>;
    abstract del(key: string): Promise<void>;
}