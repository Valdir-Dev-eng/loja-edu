import { createClient, RedisClientType } from 'redis';
import { CachePort } from '../../domain/database/CachePort';
import { ConfigCache, ICacheSecret } from '../config/ConfigCache';
import { isRedisConnectionFailure } from '../shared/isRedisConnectionFailure';
import { RedisCircuitBreaker } from '../shared/RedisCircuitBreaker';
import { withTimeout } from '../shared/withTimeout';

const RECONNECT_MAX_DELAY_MS = 10_000;
const PING_INTERVAL_MS = 30_000;
const ERROR_LOG_AGGREGATION_WINDOW_MS = 5_000;

export class RedisCacheAdapter extends CachePort {
    private readonly client: RedisClientType;
    private readonly timeoutMs: number;
    private aggregatedErrorCount = 0;
    private lastLoggedErrorAt = 0;

    // O breaker e' o MESMO objeto passado pro RedisRateLimiterAdapter — ver
    // comentario em RedisCircuitBreaker.ts sobre por que isso e' intencional.
    // `secrets` so e' passado explicitamente em teste (mesmo motivo do
    // RedisRateLimiterAdapter) — nunca em producao, onde o default
    // (ConfigCache) e' o unico Redis do projeto.
    constructor(
        private readonly breaker: RedisCircuitBreaker,
        secrets: ICacheSecret = ConfigCache.getSecrets()
    ) {
        super();
        this.timeoutMs = secrets.timeoutMs;
        this.client = createClient({
            username: 'default',
            password: secrets.key,
            pingInterval: PING_INTERVAL_MS,
            disableOfflineQueue: true,
            socket: {
                host: secrets.host,
                port: secrets.port,
                keepAlive: true,
                reconnectStrategy: (retries) => Math.min(2 ** retries * 100, RECONNECT_MAX_DELAY_MS),
            },
        });
        this.client.on('error', (error) => this.handleClientError(error));
        // Fire-and-forget de proposito — nunca bloqueia o boot esperando o
        // Redis, e o catch garante que nao vira unhandled rejection. Ver o
        // mesmo comentario, mais detalhado, em RedisRateLimiterAdapter.ts.
        this.client.connect().catch(() => {});
    }

    private handleClientError(error: unknown): void {
        this.aggregatedErrorCount++;
        const now = Date.now();
        if (now - this.lastLoggedErrorAt > ERROR_LOG_AGGREGATION_WINDOW_MS) {
            console.error(
                `[RedisCacheAdapter] erro de socket — ${this.aggregatedErrorCount} ocorrência(s) desde o último log: ${(error as Error)?.message ?? error}`
            );
            this.lastLoggedErrorAt = now;
            this.aggregatedErrorCount = 0;
        }
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        if (!this.breaker.shouldAttemptRedis()) {
            return; // no-op silencioso — cache e' sempre best-effort, nunca quebra a request
        }
        try {
            await withTimeout(this.client.set(key, value, { EX: ttlSeconds }), this.timeoutMs, "cache set");
            this.breaker.recordSuccess();
        } catch (error) {
            if (isRedisConnectionFailure(error)) {
                this.breaker.recordConnectionFailure();
            } else {
                this.breaker.recordCommandFailure(error);
            }
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.breaker.shouldAttemptRedis()) {
            return null; // chamador (ex.: GetAuthenticatedUser) trata null como "sem cache", le do Postgres
        }
        try {
            const result = await withTimeout(this.client.get(key), this.timeoutMs, "cache get");
            this.breaker.recordSuccess();
            return result;
        } catch (error) {
            if (isRedisConnectionFailure(error)) {
                this.breaker.recordConnectionFailure();
            } else {
                this.breaker.recordCommandFailure(error);
            }
            return null;
        }
    }

    async del(key: string): Promise<void> {
        if (!this.breaker.shouldAttemptRedis()) {
            return;
        }
        try {
            await withTimeout(this.client.del(key), this.timeoutMs, "cache del");
            this.breaker.recordSuccess();
        } catch (error) {
            if (isRedisConnectionFailure(error)) {
                this.breaker.recordConnectionFailure();
            } else {
                this.breaker.recordCommandFailure(error);
            }
        }
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }
}
