import { RateLimiterPort } from "../../domain/rateLimit/RateLimiterPort";
import { IRequest, middleWare } from "../server/ServerPort";
import { RateLimitRouteRules } from "./RateLimitRouteRules";

const UNKNOWN_CLIENT_KEY = "unknown-client";

export class RateLimitMiddleware {
    constructor(private rateLimiter: RateLimiterPort, private routeRules: typeof RateLimitRouteRules) {}

    handle: middleWare = async (req, res, next) => {
        const rule = this.routeRules.resolve(req.method, req.path);
        if (!rule || rule.tiers.length === 0) {
            next();
            return;
        }

        const clientKey = this.resolveClientKey(req);
        for (const tier of rule.tiers) {
            const key = `${tier.tierId}:${rule.routeId}:${clientKey}`;
            const decision = await this.rateLimiter.consume(key, tier);
            if (!decision.allowed) {
                res.status(429).json({
                    error: "Muitas requisições. Tente novamente mais tarde.",
                    retryAfterMs: decision.retryAfterMs,
                });
                return;
            }
        }

        next();
    };

    private resolveClientKey(req: IRequest): string {
        return req.ip ?? UNKNOWN_CLIENT_KEY;
    }
}
