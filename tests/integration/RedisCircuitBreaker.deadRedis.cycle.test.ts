import { afterEach, describe, expect, it, vi } from "vitest";
import { RateLimitTierConfig } from "../../src/domain/rateLimit/RateLimitPolicy";
import { InMemoryRateLimiter } from "../../src/infra/rateLimit/InMemoryRateLimiter";
import { RedisRateLimiterAdapter } from "../../src/infra/rateLimit/RedisRateLimiterAdapter";
import { RedisCircuitBreaker } from "../../src/infra/shared/RedisCircuitBreaker";

// Endpoint deliberadamente morto — nada escuta na porta 1 do loopback.
// Propositalmente NÃO aponta pro Redis real do projeto: essas chamadas
// precisam falhar de verdade, sem depender (nem arriscar) o Redis usado
// pelos outros testes/dev.
const DEAD_SECRETS = { key: "irrelevant", host: "127.0.0.1", port: 1, timeoutMs: 300 };

const config: RateLimitTierConfig = {
    tierId: "dead-redis-cycle",
    minIntervalMs: 0,
    windowMs: 60_000,
    maxRequestsInWindow: 1000,
    blockDurationMs: 60_000,
    fallbackPolicy: "in-memory",
};

describe("RedisCircuitBreaker — ciclo completo contra Redis real morto", () => {
    let adapters: RedisRateLimiterAdapter[] = [];
    let fallback: InMemoryRateLimiter;

    afterEach(() => {
        // destroy() e' sincrono e forca o fechamento na hora (rejeita
        // qualquer coisa pendente) — de proposito, em vez do disconnect()
        // publico do adapter (que manda QUIT e espera resposta): contra o
        // endpoint morto isso nunca responderia, e travaria o afterEach.
        for (const adapter of adapters) {
            try {
                (adapter as unknown as { client: { destroy(): void } }).client.destroy();
            } catch {
                // já destruído / nunca chegou a abrir — sem problema.
            }
        }
        adapters = [];
        fallback?.stop();
    });

    it("fechado -> N falhas de conexão reais -> aberto -> chamadas seguintes fazem bypass (não tocam o Redis) -> sonda de meia-abertura reabre tentativa -> fecha de novo quando o Redis responde", async () => {
        // Breaker novo por teste — ver confirmação de reset entre testes no
        // relatório final; nenhum estado de módulo é reaproveitado aqui.
        const breaker = new RedisCircuitBreaker({ failureThreshold: 2, halfOpenIntervalMs: 250 });
        fallback = new InMemoryRateLimiter();
        const deadAdapter = new RedisRateLimiterAdapter(breaker, fallback, DEAD_SECRETS);
        adapters.push(deadAdapter);

        const evalSpy = vi.spyOn(deadAdapter["client"], "eval");

        // FECHADO -> tenta o Redis de verdade a cada chamada, até abrir.
        expect(breaker.currentState).toBe("closed");
        const first = await deadAdapter.consume("k1", config);
        const second = await deadAdapter.consume("k2", config);

        // Redis morto + fallback in-memory => ambas ainda são permitidas,
        // só que servidas localmente, não pelo Redis.
        expect(first.allowed).toBe(true);
        expect(second.allowed).toBe(true);
        expect(breaker.currentState).toBe("open");
        expect(evalSpy).toHaveBeenCalledTimes(2);

        // ABERTO -> bypass total: nem tenta o Redis (eval não é chamado de novo).
        await deadAdapter.consume("k3", config);
        expect(evalSpy).toHaveBeenCalledTimes(2);

        // Espera a janela de meia-abertura passar.
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Ainda morto: a sonda de meia-abertura tenta UMA vez, falha, volta a
        // empurrar a próxima sonda pra frente — prova que o "half-open" é
        // uma tentativa real, não um estado inerte.
        await deadAdapter.consume("k4", config);
        expect(evalSpy).toHaveBeenCalledTimes(3);
        expect(breaker.currentState).toBe("open");

        // FECHA DE NOVO: mesmo breaker (estado compartilhado, como em
        // produção entre cache e rate limiter), mas agora por um adapter
        // apontado pro Redis REAL do projeto — a sonda de meia-abertura
        // seguinte é atendida de verdade, prova o ciclo completo sem precisar
        // "ressuscitar" o endpoint morto (impossível de simular).
        //
        // O client real leva um tempo de conexão (TLS + AUTH) que não
        // controlamos daqui — em vez de cravar um `sleep` e torcer, insiste
        // em consume() até a sonda ser atendida de verdade ou estourar o
        // prazo do teste. Cada tentativa que falhar por "ainda conectando"
        // conta como uma nova falha de conexão e só empurra a próxima sonda
        // pra frente (mesmo comportamento validado acima), nunca trava.
        const healthyAdapter = new RedisRateLimiterAdapter(breaker, fallback);
        adapters.push(healthyAdapter);

        let healthyResult;
        for (let attempt = 0; attempt < 20 && breaker.currentState !== "closed"; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            healthyResult = await healthyAdapter.consume(`k5-${Date.now()}-${attempt}`, config);
        }

        expect(healthyResult?.allowed).toBe(true);
        expect(breaker.currentState).toBe("closed");
    }, 15_000);
});
