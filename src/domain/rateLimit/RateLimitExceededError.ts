export class RateLimitExceededError extends Error {
    constructor(readonly retryAfterMs: number | null) {
        super("Muitas requisições. Tente novamente mais tarde.");
        this.name = "RateLimitExceededError";
    }
}
