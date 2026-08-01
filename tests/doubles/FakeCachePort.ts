import { CachePort } from "../../src/domain/database/CachePort";

export class FakeCachePort extends CachePort {
    private store: Map<string, string> = new Map();
    private ttlByKey: Map<string, number> = new Map();

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        this.store.set(key, value);
        this.ttlByKey.set(key, ttlSeconds);
    }

    getTtl(key: string): number | undefined {
        return this.ttlByKey.get(key);
    }

    async get(key: string): Promise<string | null> {
        return this.store.get(key) ?? null;
    }

    async del(key: string): Promise<void> {
        this.store.delete(key);
    }

    has(key: string): boolean {
        return this.store.has(key);
    }
}
