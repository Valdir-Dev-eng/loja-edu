/**
 * Deduplicates concurrent async work sharing the same key: the first caller runs `fn`,
 * every other caller that arrives while it's still in flight gets the same pending
 * promise instead of triggering another execution. Prevents a cache-miss stampede
 * (many requests hitting the DB at once right after a cache key expires) from turning
 * into many redundant queries — only one goes through, the rest just wait on it.
 */
export class SingleFlight {
    private inFlight = new Map<string, Promise<unknown>>();

    run<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const existing = this.inFlight.get(key) as Promise<T> | undefined;
        if (existing) {
            return existing;
        }

        const promise = fn().finally(() => {
            this.inFlight.delete(key);
        });
        this.inFlight.set(key, promise);
        return promise;
    }
}
