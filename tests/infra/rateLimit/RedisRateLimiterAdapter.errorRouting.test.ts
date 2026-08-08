import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryRateLimiter } from "../../../src/infra/rateLimit/InMemoryRateLimiter";
import { RedisRateLimiterAdapter } from "../../../src/infra/rateLimit/RedisRateLimiterAdapter";
import { RedisCircuitBreaker } from "../../../src/infra/shared/RedisCircuitBreaker";

// Endpoint morto só pra não gastar o Redis real do projeto tentando conectar
// de verdade — este teste não depende do resultado da conexão, só simula
// diretamente o evento 'error' do client (é isso que uma falha real de
// pingInterval também dispara, pelo mesmo EventEmitter).
const DEAD_SECRETS = { key: "irrelevant", host: "127.0.0.1", port: 1, timeoutMs: 300 };

describe("RedisRateLimiterAdapter — falha de pingInterval passa pelo mesmo handler agregado", () => {
    let adapter: RedisRateLimiterAdapter;
    let fallback: InMemoryRateLimiter;

    afterEach(() => {
        (adapter as unknown as { client: { destroy(): void } })?.client.destroy();
        fallback?.stop();
    });

    it("um erro de socket emitido pelo client (mesma via que uma falha de ping usaria) aciona o handler agregado, não um stack trace solto", () => {
        const breaker = new RedisCircuitBreaker({ failureThreshold: 5, halfOpenIntervalMs: 60_000 });
        fallback = new InMemoryRateLimiter();
        adapter = new RedisRateLimiterAdapter(breaker, fallback, DEAD_SECRETS);

        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // O client so tem UM listener de 'error' registrado (no construtor) —
        // por construção, qualquer origem do evento (ping, socket, DNS)
        // passa pelo mesmo caminho. Simula aqui o que uma falha de
        // pingInterval de verdade emitiria: o mesmo evento, no mesmo emitter.
        const client = (adapter as unknown as { client: NodeJS.EventEmitter }).client;
        expect(client.listenerCount("error")).toBe(1);

        client.emit("error", new Error("ping timeout simulado"));

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy.mock.calls[0][0]).toContain("[RedisRateLimiterAdapter] erro de socket");

        consoleErrorSpy.mockRestore();
    });
});
