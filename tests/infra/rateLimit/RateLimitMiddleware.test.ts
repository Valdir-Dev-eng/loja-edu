import { describe, expect, it } from "vitest";
import { RateLimitMiddleware } from "../../../src/infra/rateLimit/RateLimitMiddleware";
import { RateLimitRouteRules } from "../../../src/infra/rateLimit/RateLimitRouteRules";
import { IRequest, IResponse } from "../../../src/infra/server/ServerPort";
import { FakeRateLimiterPort } from "../../doubles/FakeRateLimiterPort";

class FakeResponse {
    public statusCode: number | null = null;
    public jsonBody: unknown = null;

    status(status: number): IResponse {
        this.statusCode = status;
        return this as unknown as IResponse;
    }

    json(body: unknown): IResponse {
        this.jsonBody = body;
        return this as unknown as IResponse;
    }
}

const buildRequest = (method: string, path: string, ip = "203.0.113.7"): IRequest =>
    ({ method, path, ip } as unknown as IRequest);

const buildMiddleware = () => {
    const rateLimiter = new FakeRateLimiterPort();
    const middleware = new RateLimitMiddleware(rateLimiter, RateLimitRouteRules);
    return { middleware, rateLimiter };
};

describe("RateLimitMiddleware", () => {
    it("deixa passar direto uma rota não mapeada na tabela, sem tocar no rate limiter", async () => {
        const { middleware, rateLimiter } = buildMiddleware();
        const req = buildRequest("GET", "/app/index.html");
        const res = new FakeResponse();
        let nextCalled = false;

        await middleware.handle(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(true);
        expect(rateLimiter.consumeCalls).toHaveLength(0);
    });

    it("deixa passar direto uma rota explicitamente isenta (webhook do Mercado Pago), sem tocar no rate limiter", async () => {
        const { middleware, rateLimiter } = buildMiddleware();
        const req = buildRequest("POST", "/webhooks/mercadopago");
        const res = new FakeResponse();
        let nextCalled = false;

        await middleware.handle(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(true);
        expect(rateLimiter.consumeCalls).toHaveLength(0);
    });

    it("consome a tier certa com a chave tier:routeId:cliente e chama next quando permitido", async () => {
        const { middleware, rateLimiter } = buildMiddleware();
        rateLimiter.queueDecision({ allowed: true, retryAfterMs: null });
        const req = buildRequest("GET", "/order/my", "198.51.100.9");
        const res = new FakeResponse();
        let nextCalled = false;

        await middleware.handle(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(true);
        expect(rateLimiter.consumeCalls).toEqual([
            expect.objectContaining({ key: "authenticated-read:order-my:198.51.100.9" }),
        ]);
    });

    it("responde 429 com retryAfterMs e nunca chama next quando o rate limiter recusa", async () => {
        const { middleware, rateLimiter } = buildMiddleware();
        rateLimiter.queueDecision({ allowed: false, retryAfterMs: 30_000 });
        const req = buildRequest("POST", "/categories");
        const res = new FakeResponse();
        let nextCalled = false;

        await middleware.handle(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(429);
        expect(res.jsonBody).toEqual({
            error: "Muitas requisições. Tente novamente mais tarde.",
            retryAfterMs: 30_000,
        });
    });

    it("checa as duas tiers empilhadas do upload de imagem, em ordem, e para na primeira que recusar", async () => {
        const { middleware, rateLimiter } = buildMiddleware();
        rateLimiter.queueDecision({ allowed: true, retryAfterMs: null });
        rateLimiter.queueDecision({ allowed: false, retryAfterMs: 60_000 });
        const req = buildRequest("POST", "/admin/products/produto-1/images");
        const res = new FakeResponse();
        let nextCalled = false;

        await middleware.handle(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(429);
        expect(rateLimiter.consumeCalls).toHaveLength(2);
        expect(rateLimiter.consumeCalls[0].key).toContain("paid-external-call:product-image-upload:");
        expect(rateLimiter.consumeCalls[1].key).toContain("image-upload:product-image-upload:");
    });

    it("libera o upload de imagem só quando as duas tiers empilhadas permitem", async () => {
        const { middleware, rateLimiter } = buildMiddleware();
        rateLimiter.queueDecision({ allowed: true, retryAfterMs: null });
        rateLimiter.queueDecision({ allowed: true, retryAfterMs: null });
        const req = buildRequest("POST", "/admin/products/produto-1/images");
        const res = new FakeResponse();
        let nextCalled = false;

        await middleware.handle(req, res as unknown as IResponse, () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(true);
        expect(rateLimiter.consumeCalls).toHaveLength(2);
    });

    it("usa 'unknown-client' na chave quando o IP não está disponível", async () => {
        const { middleware, rateLimiter } = buildMiddleware();
        rateLimiter.queueDecision({ allowed: true, retryAfterMs: null });
        const req = { method: "GET", path: "/order/my", ip: undefined } as unknown as IRequest;
        const res = new FakeResponse();

        await middleware.handle(req, res as unknown as IResponse, () => {});

        expect(rateLimiter.consumeCalls[0].key).toBe("authenticated-read:order-my:unknown-client");
    });
});
