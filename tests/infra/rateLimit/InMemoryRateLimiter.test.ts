import { afterEach, describe, expect, it } from "vitest";
import { RateLimitTierConfig } from "../../../src/domain/rateLimit/RateLimitPolicy";
import { InMemoryRateLimiter } from "../../../src/infra/rateLimit/InMemoryRateLimiter";

function peekStates(limiter: InMemoryRateLimiter): Map<string, unknown> {
    return (limiter as unknown as { states: Map<string, unknown> }).states;
}

describe("InMemoryRateLimiter", () => {
    let limiter: InMemoryRateLimiter;

    afterEach(() => {
        limiter?.stop();
    });

    describe("comportamento de tier via consume() (reusa RateLimitPolicy, já testada isoladamente)", () => {
        it("permite até o limite da janela e bloqueia com retryAfterMs = blockDurationMs a partir daí", async () => {
            limiter = new InMemoryRateLimiter();
            const config: RateLimitTierConfig = {
                tierId: "t",
                minIntervalMs: 0,
                windowMs: 60_000,
                maxRequestsInWindow: 2,
                blockDurationMs: 5_000,
                fallbackPolicy: "in-memory",
            };
            const key = "tier-window";

            expect((await limiter.consume(key, config)).allowed).toBe(true);
            expect((await limiter.consume(key, config)).allowed).toBe(true);
            const third = await limiter.consume(key, config);
            expect(third.allowed).toBe(false);
            expect(third.retryAfterMs).toBe(5_000);
        });

        it("respeita minIntervalMs entre requisições", async () => {
            limiter = new InMemoryRateLimiter();
            const config: RateLimitTierConfig = {
                tierId: "t",
                minIntervalMs: 1_000,
                windowMs: 60_000,
                maxRequestsInWindow: 100,
                blockDurationMs: 5_000,
                fallbackPolicy: "in-memory",
            };
            const key = "tier-min-interval";

            expect((await limiter.consume(key, config)).allowed).toBe(true);
            const second = await limiter.consume(key, config);
            expect(second.allowed).toBe(false);
            expect(second.retryAfterMs).toBeGreaterThan(0);
            expect(second.retryAfterMs).toBeLessThanOrEqual(1_000);
        });

        it("uma negativa por já-estar-bloqueado NÃO estende o bloqueio original (só a primeira estoura a janela)", async () => {
            limiter = new InMemoryRateLimiter();
            const config: RateLimitTierConfig = {
                tierId: "t",
                minIntervalMs: 0,
                windowMs: 50,
                maxRequestsInWindow: 1,
                blockDurationMs: 300,
                fallbackPolicy: "in-memory",
            };
            const key = "tier-no-extend";

            await limiter.consume(key, config); // 1ª: permitida
            const blocked = await limiter.consume(key, config); // 2ª: estoura a janela, bloqueia até +300ms
            expect(blocked.allowed).toBe(false);
            expect(blocked.retryAfterMs).toBe(300);

            await new Promise((resolve) => setTimeout(resolve, 160));
            const stillBlocked = await limiter.consume(key, config); // 3ª: já bloqueado, não deve mexer no blockedUntil
            expect(stillBlocked.allowed).toBe(false);

            // A prova real: se a 3ª chamada tivesse reestendido blockedUntil
            // (bug), aos ~320ms totais ainda estaríamos dentro dos 300ms a
            // partir da 3ª chamada — bloqueado. Sem reextensão, o bloqueio
            // original (300ms a partir da 2ª chamada) já expirou, e a janela
            // de contagem também (50ms) — a 4ª chamada tem que passar.
            await new Promise((resolve) => setTimeout(resolve, 160));
            const afterOriginalBlockExpires = await limiter.consume(key, config); // 4ª
            expect(afterOriginalBlockExpires.allowed).toBe(true);
        });
    });

    describe("teto de entradas com eviction LRU", () => {
        it("ao estourar o teto, descarta a entrada mais antiga (LRU) — chave descartada reinicia do zero", async () => {
            limiter = new InMemoryRateLimiter(2, 30_000);
            const config: RateLimitTierConfig = {
                tierId: "t",
                minIntervalMs: 0,
                windowMs: 60_000,
                maxRequestsInWindow: 1,
                blockDurationMs: 60_000,
                fallbackPolicy: "in-memory",
            };

            await limiter.consume("a", config);
            await limiter.consume("b", config);
            await limiter.consume("c", config); // estoura o teto de 2, descarta "a" (mais antiga)

            expect(peekStates(limiter).size).toBe(2);
            expect(peekStates(limiter).has("a")).toBe(false);

            // "a" foi descartada => reaparece como se fosse a 1ª requisição dela
            // (se não tivesse sido descartada, essa seria a 2ª dentro da janela
            // com maxRequestsInWindow=1, e viria bloqueada).
            const afterEviction = await limiter.consume("a", config);
            expect(afterEviction.allowed).toBe(true);
        });
    });

    describe("varredura periódica de entradas expiradas", () => {
        it("remove do Map uma entrada expirada depois que a varredura roda", async () => {
            limiter = new InMemoryRateLimiter(500, 50);
            const config: RateLimitTierConfig = {
                tierId: "t",
                minIntervalMs: 0,
                windowMs: 10,
                maxRequestsInWindow: 1,
                blockDurationMs: 10,
                fallbackPolicy: "in-memory",
            };

            await limiter.consume("expira", config);
            expect(peekStates(limiter).has("expira")).toBe(true);

            await new Promise((resolve) => setTimeout(resolve, 200));

            expect(peekStates(limiter).has("expira")).toBe(false);
        });
    });

    describe("stop()", () => {
        it("limpa o timer de varredura", () => {
            limiter = new InMemoryRateLimiter();
            limiter.stop();
            expect((limiter as unknown as { sweepTimer: unknown }).sweepTimer).toBeNull();
        });

        it("chamar stop() duas vezes não quebra", () => {
            limiter = new InMemoryRateLimiter();
            limiter.stop();
            expect(() => limiter.stop()).not.toThrow();
        });
    });
});
