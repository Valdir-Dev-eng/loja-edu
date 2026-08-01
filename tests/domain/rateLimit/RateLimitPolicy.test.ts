import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitPolicy, RateLimitState, RateLimitTierConfig } from "../../../src/domain/rateLimit/RateLimitPolicy";

const config: RateLimitTierConfig = {
    tierId: "test-tier",
    minIntervalMs: 3000,
    windowMs: 5 * 60 * 1000,
    maxRequestsInWindow: 3,
    blockDurationMs: 5 * 60 * 1000,
};

const emptyState: RateLimitState = {
    lastRequestAt: null,
    requestTimestampsInWindow: [],
    blockedUntil: null,
};

describe("RateLimitPolicy", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("intervalo mínimo entre requisições", () => {
        it("permite a primeira requisição, sem histórico algum", () => {
            const policy = new RateLimitPolicy(config);

            const decision = policy.evaluate(emptyState);

            expect(decision.allowed).toBe(true);
            expect(decision.retryAfterMs).toBeNull();
        });

        it("recusa uma segunda requisição antes do intervalo mínimo passar", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({ ...emptyState, lastRequestAt: now - 1000 });

            expect(decision.allowed).toBe(false);
            expect(decision.retryAfterMs).toBe(2000);
        });

        it("permite a requisição assim que o intervalo mínimo passa", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({ ...emptyState, lastRequestAt: now - 3000 });

            expect(decision.allowed).toBe(true);
        });
    });

    describe("janela de N requisições", () => {
        it("permite enquanto o total na janela está abaixo do máximo", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({
                ...emptyState,
                lastRequestAt: now - 10_000,
                requestTimestampsInWindow: [now - 60_000, now - 30_000],
            });

            expect(decision.allowed).toBe(true);
        });

        it("recusa ao atingir o máximo de requisições na janela", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({
                ...emptyState,
                lastRequestAt: now - 10_000,
                requestTimestampsInWindow: [now - 60_000, now - 30_000, now - 10_000],
            });

            expect(decision.allowed).toBe(false);
            expect(decision.retryAfterMs).toBe(config.blockDurationMs);
        });

        it("ignora requisições fora da janela ao contar", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({
                ...emptyState,
                lastRequestAt: now - 10_000,
                requestTimestampsInWindow: [now - 10 * 60_000, now - 8 * 60_000, now - 6 * 60_000],
            });

            expect(decision.allowed).toBe(true);
        });
    });

    describe("bloqueio e liberação", () => {
        it("recusa enquanto o bloqueio ainda está ativo", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({ ...emptyState, blockedUntil: now + 120_000 });

            expect(decision.allowed).toBe(false);
            expect(decision.retryAfterMs).toBe(120_000);
        });

        it("libera assim que o horário de bloqueio passa", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({ ...emptyState, blockedUntil: now - 1 });

            expect(decision.allowed).toBe(true);
        });

        it("prioriza o bloqueio sobre o intervalo mínimo quando os dois estariam ativos", () => {
            const policy = new RateLimitPolicy(config);
            const now = Date.now();

            const decision = policy.evaluate({
                lastRequestAt: now - 500,
                requestTimestampsInWindow: [],
                blockedUntil: now + 60_000,
            });

            expect(decision.retryAfterMs).toBe(60_000);
        });
    });
});
