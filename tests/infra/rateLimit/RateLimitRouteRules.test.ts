import { describe, expect, it } from "vitest";
import { RateLimitRouteRules } from "../../../src/infra/rateLimit/RateLimitRouteRules";

const expectTierIds = (method: string, path: string, expectedTierIds: string[]) => {
    const rule = RateLimitRouteRules.resolve(method, path);
    expect(rule).not.toBeNull();
    expect(rule!.tiers.map((tier) => tier.tierId)).toEqual(expectedTierIds);
};

describe("RateLimitRouteRules", () => {
    describe("cada rota real do projeto resolve para a tier certa", () => {
        it("GET /auth/google -> oauth", () => {
            expectTierIds("GET", "/auth/google", ["oauth"]);
        });

        it("GET /auth/google/callback -> oauth", () => {
            expectTierIds("GET", "/auth/google/callback", ["oauth"]);
        });

        it("POST /auth/logout -> authenticated-read", () => {
            expectTierIds("POST", "/auth/logout", ["authenticated-read"]);
        });

        it("GET /auth/me -> authenticated-read", () => {
            expectTierIds("GET", "/auth/me", ["authenticated-read"]);
        });

        it("POST /auth/onboarding -> generic-write", () => {
            expectTierIds("POST", "/auth/onboarding", ["generic-write"]);
        });

        it("GET /addresses/my -> authenticated-read", () => {
            expectTierIds("GET", "/addresses/my", ["authenticated-read"]);
        });

        it("POST /addresses -> generic-write", () => {
            expectTierIds("POST", "/addresses", ["generic-write"]);
        });

        it("DELETE /addresses/:id -> generic-write", () => {
            expectTierIds("DELETE", "/addresses/endereco-123", ["generic-write"]);
        });

        it("POST /product/ -> generic-write (criação)", () => {
            expectTierIds("POST", "/product/", ["generic-write"]);
        });

        it("PUT /product/:id -> generic-write (atualização)", () => {
            expectTierIds("PUT", "/product/produto-123", ["generic-write"]);
        });

        it("DELETE /product/:id -> generic-write", () => {
            expectTierIds("DELETE", "/product/produto-123", ["generic-write"]);
        });

        it("GET /product/:id -> authenticated-read (sem cache-aside ainda)", () => {
            expectTierIds("GET", "/product/produto-123", ["authenticated-read"]);
        });

        it("GET /product/ -> isenta (lista com cache-aside de verdade por trás)", () => {
            expectTierIds("GET", "/product/", []);
        });

        it("POST /order/checkout -> paid-external-call (cobra no Mercado Pago)", () => {
            expectTierIds("POST", "/order/checkout", ["paid-external-call"]);
        });

        it("GET /order/my -> authenticated-read", () => {
            expectTierIds("GET", "/order/my", ["authenticated-read"]);
        });

        it("GET /order/:id/payment-status -> authenticated-read (polling esperado do app)", () => {
            expectTierIds("GET", "/order/pedido-123/payment-status", ["authenticated-read"]);
        });

        it("POST /webhooks/mercadopago -> isenta explicitamente (assinatura HMAC já protege)", () => {
            expectTierIds("POST", "/webhooks/mercadopago", []);
        });

        it("GET /admin/orders -> authenticated-read", () => {
            expectTierIds("GET", "/admin/orders", ["authenticated-read"]);
        });

        it("GET /admin/users -> authenticated-read", () => {
            expectTierIds("GET", "/admin/users", ["authenticated-read"]);
        });

        it("GET /dev/promote-me -> generic-write (escreve role em users)", () => {
            expectTierIds("GET", "/dev/promote-me", ["generic-write"]);
        });

        it("POST /categories -> generic-write", () => {
            expectTierIds("POST", "/categories", ["generic-write"]);
        });

        it("GET /categories -> isenta (lista com cache-aside de verdade por trás)", () => {
            expectTierIds("GET", "/categories", []);
        });

        it("POST /admin/products/:id/images -> paid-external-call empilhada com image-upload", () => {
            expectTierIds("POST", "/admin/products/produto-123/images", ["paid-external-call", "image-upload"]);
        });

        it("DELETE /admin/products/:id/images/:imageId -> paid-external-call", () => {
            expectTierIds("DELETE", "/admin/products/produto-123/images/imagem-456", ["paid-external-call"]);
        });

        it("GET /product/:id/images -> authenticated-read (sem cache-aside ainda)", () => {
            expectTierIds("GET", "/product/produto-123/images", ["authenticated-read"]);
        });

        it("POST /shipping/quote -> paid-external-call (chama o Melhor Envio)", () => {
            expectTierIds("POST", "/shipping/quote", ["paid-external-call"]);
        });

        it("GET /admin/melhor-envio/connect -> oauth", () => {
            expectTierIds("GET", "/admin/melhor-envio/connect", ["oauth"]);
        });

        it("GET /callback/melhor/envio -> oauth", () => {
            expectTierIds("GET", "/callback/melhor/envio", ["oauth"]);
        });

        it("POST /admin/orders/:id/purchase-label -> paid-external-call", () => {
            expectTierIds("POST", "/admin/orders/pedido-123/purchase-label", ["paid-external-call"]);
        });

        it("GET /admin/orders/:id/label-print-link -> paid-external-call", () => {
            expectTierIds("GET", "/admin/orders/pedido-123/label-print-link", ["paid-external-call"]);
        });
    });

    describe("rotas não mapeadas ou assets estáticos", () => {
        it("devolve null para uma rota que não existe na tabela", () => {
            expect(RateLimitRouteRules.resolve("GET", "/app/index.html")).toBeNull();
        });

        it("devolve null quando o método não bate, mesmo com o path idêntico a uma rota mapeada", () => {
            expect(RateLimitRouteRules.resolve("PATCH", "/product/produto-123")).toBeNull();
        });
    });

    describe("o matcher não confunde rotas com o mesmo prefixo mas número diferente de segmentos", () => {
        it("distingue POST /product/ (criação) de PUT /product/:id (atualização) só pelo método+segmentos", () => {
            const create = RateLimitRouteRules.resolve("POST", "/product/");
            const update = RateLimitRouteRules.resolve("PUT", "/product/produto-123");

            expect(create!.routeId).toBe("product-create");
            expect(update!.routeId).toBe("product-update");
        });

        it("distingue upload de imagem (4 segmentos) de delete de imagem (5 segmentos)", () => {
            const upload = RateLimitRouteRules.resolve("POST", "/admin/products/produto-123/images");
            const remove = RateLimitRouteRules.resolve("DELETE", "/admin/products/produto-123/images/imagem-456");

            expect(upload!.routeId).toBe("product-image-upload");
            expect(remove!.routeId).toBe("product-image-delete");
        });

        it("não confunde GET /product/:id com GET /product/:id/images (segmentos diferentes)", () => {
            const byId = RateLimitRouteRules.resolve("GET", "/product/produto-123");
            const images = RateLimitRouteRules.resolve("GET", "/product/produto-123/images");

            expect(byId!.routeId).toBe("product-get-by-id");
            expect(images!.routeId).toBe("product-image-list");
        });
    });
});
