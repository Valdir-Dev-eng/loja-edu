import { RateLimitDecision, RateLimitTierConfig } from "../../src/domain/rateLimit/RateLimitPolicy";
import { RateLimiterPort } from "../../src/domain/rateLimit/RateLimiterPort";

export class FakeRateLimiterPort extends RateLimiterPort {
    public consumeCalls: { key: string; config: RateLimitTierConfig }[] = [];
    private queuedDecisions: RateLimitDecision[] = [];

    queueDecision(decision: RateLimitDecision): void {
        this.queuedDecisions.push(decision);
    }

    async consume(key: string, config: RateLimitTierConfig): Promise<RateLimitDecision> {
        this.consumeCalls.push({ key, config });
        return this.queuedDecisions.shift() ?? { allowed: true, retryAfterMs: null };
    }
}
