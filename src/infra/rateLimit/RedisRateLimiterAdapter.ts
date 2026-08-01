import { createClient, RedisClientType } from "redis";
import { RateLimitDecision, RateLimitTierConfig } from "../../domain/rateLimit/RateLimitPolicy";
import { RateLimiterPort } from "../../domain/rateLimit/RateLimiterPort";
import { ConfigCache } from "../config/ConfigCache";

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

export class RedisRateLimiterAdapter extends RateLimiterPort {
    private client: RedisClientType;
    private readonly connectionReady: Promise<void>;

    constructor() {
        super();
        const secrets = ConfigCache.getSecrets();
        this.client = createClient({
            username: "default",
            password: secrets.key,
            socket: {
                host: secrets.host,
                port: secrets.port,
                keepAlive: true,
                reconnectStrategy: (retries) => {
                    if (retries > 20) {
                        return new Error("Limite de tentativas de reconexão atingido");
                    }
                    return Math.min(retries * 50, 2000);
                },
            },
        });
        this.client.on("error", (err) => console.error("Redis Client Error (rate limiter)", err));
        this.connectionReady = this.client.connect().then(() => undefined);
    }

    async consume(key: string, config: RateLimitTierConfig): Promise<RateLimitDecision> {
        await this.connectionReady;
        const [allowed, retryAfterMs] = (await this.client.eval(RATE_LIMIT_SCRIPT, {
            keys: [key],
            arguments: [
                String(Date.now()),
                String(config.minIntervalMs),
                String(config.windowMs),
                String(config.maxRequestsInWindow),
                String(config.blockDurationMs),
            ],
        })) as [number, number];

        return {
            allowed: allowed === 1,
            retryAfterMs: allowed === 1 ? null : retryAfterMs,
        };
    }

    async disconnect(): Promise<void> {
        await this.connectionReady;
        await this.client.quit();
    }
}
