import { afterAll, describe, expect, it } from "vitest";
import { RateLimitTierConfig } from "../../src/domain/rateLimit/RateLimitPolicy";
import { RedisRateLimiterAdapter } from "../../src/infra/rateLimit/RedisRateLimiterAdapter";
import { RedisCircuitBreaker } from "../../src/infra/shared/RedisCircuitBreaker";
import { InMemoryRateLimiter } from "../../src/infra/rateLimit/InMemoryRateLimiter";

describe("RedisRateLimiterAdapter — prova de concorrência real (Redis do projeto, não Fake)", () => {
    // Breaker dedicado a este describe, novo por cima do modulo — nao e' o
    // breaker compartilhado do AppModule. Fica fechado o tempo todo aqui
    // porque o Redis real do projeto esta no ar; o teste de ciclo
    // fechado->aberto->fallback mora em outro arquivo, contra um endpoint
    // deliberadamente morto.
    const breaker = new RedisCircuitBreaker({ failureThreshold: 3, halfOpenIntervalMs: 15_000 });
    const fallback = new InMemoryRateLimiter();
    const adapter = new RedisRateLimiterAdapter(breaker, fallback);

    afterAll(async () => {
        fallback.stop();
        await adapter.disconnect();
    });

    it("deixa passar exatamente o limite configurado quando requisições verdadeiramente paralelas disputam a mesma chave", async () => {
        const config: RateLimitTierConfig = {
            tierId: "concurrency-proof",
            minIntervalMs: 0,
            windowMs: 60_000,
            maxRequestsInWindow: 3,
            blockDurationMs: 60_000,
            fallbackPolicy: "in-memory",
        };
        const key = `ratelimit:concurrency-proof:test:${Date.now()}-${Math.random()}`;

        const results = await Promise.all(Array.from({ length: 10 }, () => adapter.consume(key, config)));

        const allowedCount = results.filter((result) => result.allowed).length;
        expect(allowedCount).toBe(3);
    });

    it("bloqueia com retryAfterMs igual à duração do bloqueio quando a janela estoura", async () => {
        const config: RateLimitTierConfig = {
            tierId: "concurrency-proof-block",
            minIntervalMs: 1,
            windowMs: 60_000,
            maxRequestsInWindow: 2,
            blockDurationMs: 45_000,
            fallbackPolicy: "in-memory",
        };
        const key = `ratelimit:concurrency-proof-block:test:${Date.now()}-${Math.random()}`;

        await adapter.consume(key, config);
        await new Promise((resolve) => setTimeout(resolve, 5));
        await adapter.consume(key, config);
        await new Promise((resolve) => setTimeout(resolve, 5));
        const thirdResult = await adapter.consume(key, config);

        expect(thirdResult.allowed).toBe(false);
        expect(thirdResult.retryAfterMs).toBe(45_000);
    });
});
