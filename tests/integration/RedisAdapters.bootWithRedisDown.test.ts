import { afterEach, describe, expect, it } from "vitest";
import { RateLimitTierConfig } from "../../src/domain/rateLimit/RateLimitPolicy";
import { RedisCacheAdapter } from "../../src/infra/database/RedisCacheAdapter";
import { InMemoryRateLimiter } from "../../src/infra/rateLimit/InMemoryRateLimiter";
import { RedisRateLimiterAdapter } from "../../src/infra/rateLimit/RedisRateLimiterAdapter";
import { RedisCircuitBreaker } from "../../src/infra/shared/RedisCircuitBreaker";

// Mesmo endpoint morto usado no teste de ciclo completo do breaker — nada
// escuta na porta 1 do loopback, então toda tentativa de conexão falha de
// verdade (não é um mock de falha).
const DEAD_SECRETS = { key: "irrelevant", host: "127.0.0.1", port: 1, timeoutMs: 300 };

const config: RateLimitTierConfig = {
    tierId: "boot-redis-down",
    minIntervalMs: 0,
    windowMs: 60_000,
    maxRequestsInWindow: 1000,
    blockDurationMs: 60_000,
    fallbackPolicy: "in-memory",
};

// Este é "o caso mais provável de acontecer de verdade num deploy": o
// processo sobe antes (ou sem nunca conseguir) do Redis estar alcançável.
// AppModule.ts constrói RedisCacheAdapter e RedisRateLimiterAdapter com
// `new` simples, sem await — a garantia que este teste prova mora
// inteiramente dentro desses dois construtores (o resto do boot do
// AppModule não adiciona nenhum await/bloqueio sobre isso). Testar aqui, no
// nível dos adapters, evita instanciar a composition root inteira (Postgres,
// Express, todos os outros gateways externos) só pra provar uma propriedade
// que pertence exclusivamente a estes dois construtores.
describe("Boot com Redis fora do ar", () => {
    let cache: RedisCacheAdapter | undefined;
    let rateLimiter: RedisRateLimiterAdapter | undefined;
    let fallback: InMemoryRateLimiter | undefined;
    let unhandledRejections: unknown[] = [];
    let onUnhandledRejection: (reason: unknown) => void;

    afterEach(() => {
        if (onUnhandledRejection) {
            process.off("unhandledRejection", onUnhandledRejection);
        }
        (cache as unknown as { client?: { destroy(): void } })?.client?.destroy();
        (rateLimiter as unknown as { client?: { destroy(): void } })?.client?.destroy();
        fallback?.stop();
        cache = undefined;
        rateLimiter = undefined;
        fallback = undefined;
        unhandledRejections = [];
    });

    it("constrói sincronamente (não bloqueia o boot), nunca gera unhandled rejection, e serve em modo degradado desde a primeira chamada", async () => {
        unhandledRejections = [];
        onUnhandledRejection = (reason) => unhandledRejections.push(reason);
        process.on("unhandledRejection", onUnhandledRejection);

        const breaker = new RedisCircuitBreaker({ failureThreshold: 1, halfOpenIntervalMs: 60_000 });
        fallback = new InMemoryRateLimiter();

        const startedAt = Date.now();
        cache = new RedisCacheAdapter(breaker, DEAD_SECRETS);
        rateLimiter = new RedisRateLimiterAdapter(breaker, fallback, DEAD_SECRETS);
        const constructionElapsedMs = Date.now() - startedAt;

        // Construir NUNCA espera o handshake de rede — tem que voltar em
        // praticamente 0ms, não em algo da ordem do timeout/connect_timeout.
        expect(constructionElapsedMs).toBeLessThan(50);

        // Primeira chamada real, com o processo "recém-subido": mesmo sem o
        // breaker ainda ter acumulado falha nenhuma (está fechado), a
        // chamada tem que resolver — nunca travar esperando a conexão morta.
        const cacheResult = await cache.get("qualquer-chave");
        const rateLimitResult = await rateLimiter.consume("qualquer-chave", config);

        expect(cacheResult).toBeNull();
        expect(rateLimitResult.allowed).toBe(true); // servido pelo fallback in-memory

        // Depois dessa falha real de conexão, o breaker (threshold=1) já
        // deve estar aberto — prova que o caminho de falha rápida
        // (disableOfflineQueue) realmente alimenta o breaker, não fica preso
        // num limbo "ainda conectando" pra sempre.
        expect(breaker.currentState).toBe("open");

        // Dá uma volta no event loop pra qualquer rejeição tardia (ex.: do
        // próprio connect() fire-and-forget do construtor) aparecer, se for
        // o caso.
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(unhandledRejections).toEqual([]);
    });
});
