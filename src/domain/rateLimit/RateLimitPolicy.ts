export interface RateLimitTierConfig {
    tierId: string;
    minIntervalMs: number;
    windowMs: number;
    maxRequestsInWindow: number;
    blockDurationMs: number;
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
