export interface RateLimitTierConfig {
    tierId: string;
    minIntervalMs: number;
    windowMs: number;
    maxRequestsInWindow: number;
    blockDurationMs: number;
    /**
     * O que fazer quando o Redis está indisponível (circuit breaker aberto):
     * degrada pro limitador local (imprecisão aceita, ver InMemoryRateLimiter).
     * Existiu uma opção "allow" (deixar passar sem contar, pra rotas onde
     * perder a notificação é pior que qualquer abuso) mas nenhum tier real
     * chegou a usá-la — o webhook de pagamento já é isento via `tiers: []`
     * em RateLimitRouteRules.ts. Removida por não ter consumidor; se um caso
     * real precisar dela, reintroduzir junto com o teste que a exercita.
     */
    fallbackPolicy: "in-memory";
}

export interface RateLimitState {
    lastRequestAt: number | null;
    requestTimestampsInWindow: number[];
    blockedUntil: number | null;
}

export interface RateLimitDecision {
    allowed: boolean;
    retryAfterMs: number | null;
}

export class RateLimitPolicy {
    constructor(private config: RateLimitTierConfig) {}

    evaluate(state: RateLimitState): RateLimitDecision {
        const now = Date.now();

        if (state.blockedUntil !== null && now < state.blockedUntil) {
            return { allowed: false, retryAfterMs: state.blockedUntil - now };
        }

        if (state.lastRequestAt !== null && now - state.lastRequestAt < this.config.minIntervalMs) {
            return { allowed: false, retryAfterMs: this.config.minIntervalMs - (now - state.lastRequestAt) };
        }

        const requestsInWindow = state.requestTimestampsInWindow.filter(
            (timestamp) => now - timestamp < this.config.windowMs
        ).length;
        if (requestsInWindow >= this.config.maxRequestsInWindow) {
            return { allowed: false, retryAfterMs: this.config.blockDurationMs };
        }

        return { allowed: true, retryAfterMs: null };
    }
}
