import { RateLimitDecision, RateLimitTierConfig } from "./RateLimitPolicy";

export abstract class RateLimiterPort {
    abstract consume(key: string, config: RateLimitTierConfig): Promise<RateLimitDecision>;
}
