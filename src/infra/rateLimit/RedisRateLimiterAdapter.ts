import { createClient, RedisClientType } from "redis";
import { RateLimitDecision, RateLimitTierConfig } from "../../domain/rateLimit/RateLimitPolicy";
import { RateLimiterPort } from "../../domain/rateLimit/RateLimiterPort";
import { ConfigCache, ICacheSecret } from "../config/ConfigCache";
import { isRedisConnectionFailure } from "../shared/isRedisConnectionFailure";
import { RedisCircuitBreaker } from "../shared/RedisCircuitBreaker";
import { withTimeout } from "../shared/withTimeout";
import { InMemoryRateLimiter } from "./InMemoryRateLimiter";

const RATE_LIMIT_SCRIPT = `
local blockedKey = KEYS[1] .. ":blocked"
local lastKey = KEYS[1] .. ":last"
local windowKey = KEYS[1] .. ":window"

local now = tonumber(ARGV[1])
local minIntervalMs = tonumber(ARGV[2])
local windowMs = tonumber(ARGV[3])
local maxRequests = tonumber(ARGV[4])
local blockDurationMs = tonumber(ARGV[5])

if redis.call("EXISTS", blockedKey) == 1 then
    local ttl = redis.call("PTTL", blockedKey)
    return {0, ttl}
end

if minIntervalMs > 0 and redis.call("EXISTS", lastKey) == 1 then
    local ttl = redis.call("PTTL", lastKey)
    return {0, ttl}
end

redis.call("ZREMRANGEBYSCORE", windowKey, 0, now - windowMs)
local count = redis.call("ZCARD", windowKey)

if count >= maxRequests then
    redis.call("SET", blockedKey, "1", "PX", blockDurationMs)
    return {0, blockDurationMs}
end

redis.call("ZADD", windowKey, now, now .. "-" .. math.random(1, 1000000000))
redis.call("PEXPIRE", windowKey, windowMs)
if minIntervalMs > 0 then
    redis.call("SET", lastKey, "1", "PX", minIntervalMs)
end

return {1, 0}
`;

const RECONNECT_MAX_DELAY_MS = 10_000;
const PING_INTERVAL_MS = 30_000;
const ERROR_LOG_AGGREGATION_WINDOW_MS = 5_000;

export class RedisRateLimiterAdapter extends RateLimiterPort {
    private readonly client: RedisClientType;
    private readonly timeoutMs: number;
    private aggregatedErrorCount = 0;
    private lastLoggedErrorAt = 0;

    // `secrets` so e' passado explicitamente em teste, pra apontar pra um
    // endpoint deliberadamente morto (ex.: 127.0.0.1:1) e provar o ciclo
    // completo do circuit breaker contra falha de conexao real — nunca
    // passar em codigo de producao, onde o default (ConfigCache) e' o unico
    // Redis do projeto.
    constructor(
        private readonly breaker: RedisCircuitBreaker,
        private readonly fallback: InMemoryRateLimiter,
        secrets: ICacheSecret = ConfigCache.getSecrets()
    ) {
        super();
        this.timeoutMs = secrets.timeoutMs;
        this.client = createClient({
            username: "default",
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
        // Um "erro" aqui inclui falha de pingInterval — o mesmo handler
        // agregado cobre os dois casos, nunca vira stack trace solto na
        // cachoeira que esta fatia existe pra matar.
        this.client.on("error", (error) => this.handleClientError(error));
        // Fire-and-forget de proposito: NUNCA bloqueia o boot do processo
        // esperando o Redis responder, e o catch garante que uma falha aqui
        // nunca vira unhandled rejection derrubando o processo. Se o Redis
        // estiver fora no boot, o breaker nasce fechado, mas a primeira
        // tentativa real (disableOfflineQueue:true rejeita na hora, sem
        // enfileirar) falha rapido e abre o circuito sozinho em seguida.
        this.client.connect().catch(() => {});
    }

    private handleClientError(error: unknown): void {
        this.aggregatedErrorCount++;
        const now = Date.now();
        if (now - this.lastLoggedErrorAt > ERROR_LOG_AGGREGATION_WINDOW_MS) {
            console.error(
                `[RedisRateLimiterAdapter] erro de socket — ${this.aggregatedErrorCount} ocorrência(s) desde o último log: ${(error as Error)?.message ?? error}`
            );
            this.lastLoggedErrorAt = now;
            this.aggregatedErrorCount = 0;
        }
    }

    async consume(key: string, config: RateLimitTierConfig): Promise<RateLimitDecision> {
        if (!this.breaker.shouldAttemptRedis()) {
            return this.fallback.consume(key, config);
        }

        try {
            const [allowed, retryAfterMs] = (await withTimeout(
                this.client.eval(RATE_LIMIT_SCRIPT, {
                    keys: [key],
                    arguments: [
                        String(Date.now()),
                        String(config.minIntervalMs),
                        String(config.windowMs),
                        String(config.maxRequestsInWindow),
                        String(config.blockDurationMs),
                    ],
                }),
                this.timeoutMs,
                "rate-limit eval"
            )) as [number, number];
            this.breaker.recordSuccess();
            return { allowed: allowed === 1, retryAfterMs: allowed === 1 ? null : retryAfterMs };
        } catch (error) {
            if (isRedisConnectionFailure(error)) {
                this.breaker.recordConnectionFailure();
            } else {
                this.breaker.recordCommandFailure(error);
            }
            return this.fallback.consume(key, config);
        }
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }
}
