import { RateLimitTierConfig } from "../../domain/rateLimit/RateLimitPolicy";

export interface RouteRateLimitRule {
    routeId: string;
    method: string;
    pathPattern: string;
    tiers: RateLimitTierConfig[];
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

const OAUTH: RateLimitTierConfig = {
    tierId: "oauth",
    minIntervalMs: 1000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 10,
    blockDurationMs: FIVE_MINUTES_MS,
};

const AUTHENTICATED_READ: RateLimitTierConfig = {
    tierId: "authenticated-read",
    minIntervalMs: 1000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 60,
    blockDurationMs: FIVE_MINUTES_MS,
};

const GENERIC_WRITE: RateLimitTierConfig = {
    tierId: "generic-write",
    minIntervalMs: 3000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 20,
    blockDurationMs: FIVE_MINUTES_MS,
};

const PAID_EXTERNAL_CALL: RateLimitTierConfig = {
    tierId: "paid-external-call",
    minIntervalMs: 5000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 5,
    blockDurationMs: TEN_MINUTES_MS,
};

const IMAGE_UPLOAD: RateLimitTierConfig = {
    tierId: "image-upload",
    minIntervalMs: 2000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 10,
    blockDurationMs: TEN_MINUTES_MS,
};

const ROUTE_RULES: RouteRateLimitRule[] = [
    { routeId: "auth-google-redirect", method: "GET", pathPattern: "/auth/google", tiers: [OAUTH] },
    { routeId: "auth-google-callback", method: "GET", pathPattern: "/auth/google/callback", tiers: [OAUTH] },
    { routeId: "auth-logout", method: "POST", pathPattern: "/auth/logout", tiers: [AUTHENTICATED_READ] },
    { routeId: "auth-refresh", method: "POST", pathPattern: "/auth/refresh", tiers: [AUTHENTICATED_READ] },
    { routeId: "auth-me", method: "GET", pathPattern: "/auth/me", tiers: [AUTHENTICATED_READ] },
    { routeId: "auth-onboarding", method: "POST", pathPattern: "/auth/onboarding", tiers: [GENERIC_WRITE] },
    { routeId: "address-list", method: "GET", pathPattern: "/addresses/my", tiers: [AUTHENTICATED_READ] },
    { routeId: "address-create", method: "POST", pathPattern: "/addresses", tiers: [GENERIC_WRITE] },
    { routeId: "address-delete", method: "DELETE", pathPattern: "/addresses/:id", tiers: [GENERIC_WRITE] },
    { routeId: "product-create", method: "POST", pathPattern: "/product/", tiers: [GENERIC_WRITE] },
    { routeId: "product-update", method: "PUT", pathPattern: "/product/:id", tiers: [GENERIC_WRITE] },
    { routeId: "product-delete", method: "DELETE", pathPattern: "/product/:id", tiers: [GENERIC_WRITE] },
    { routeId: "product-get-by-id", method: "GET", pathPattern: "/product/:id", tiers: [] },
    { routeId: "product-list", method: "GET", pathPattern: "/product/", tiers: [] },
    { routeId: "order-checkout", method: "POST", pathPattern: "/order/checkout", tiers: [PAID_EXTERNAL_CALL] },
    { routeId: "order-my", method: "GET", pathPattern: "/order/my", tiers: [AUTHENTICATED_READ] },
    {
        routeId: "order-payment-status",
        method: "GET",
        pathPattern: "/order/:id/payment-status",
        tiers: [AUTHENTICATED_READ],
    },
    { routeId: "webhook-mercadopago", method: "POST", pathPattern: "/webhooks/mercadopago", tiers: [] },
    { routeId: "admin-orders", method: "GET", pathPattern: "/admin/orders", tiers: [AUTHENTICATED_READ] },
    { routeId: "admin-users", method: "GET", pathPattern: "/admin/users", tiers: [AUTHENTICATED_READ] },
    { routeId: "dev-promote-me", method: "GET", pathPattern: "/dev/promote-me", tiers: [GENERIC_WRITE] },
    { routeId: "category-create", method: "POST", pathPattern: "/categories", tiers: [GENERIC_WRITE] },
    { routeId: "category-list", method: "GET", pathPattern: "/categories", tiers: [] },
    {
        routeId: "product-image-upload",
        method: "POST",
        pathPattern: "/admin/products/:id/images",
        tiers: [PAID_EXTERNAL_CALL, IMAGE_UPLOAD],
    },
    {
        routeId: "product-image-delete",
        method: "DELETE",
        pathPattern: "/admin/products/:id/images/:imageId",
        tiers: [PAID_EXTERNAL_CALL],
    },
    { routeId: "product-image-list", method: "GET", pathPattern: "/product/:id/images", tiers: [] },
    { routeId: "shipping-quote", method: "POST", pathPattern: "/shipping/quote", tiers: [PAID_EXTERNAL_CALL] },
    {
        routeId: "melhor-envio-connect",
        method: "GET",
        pathPattern: "/admin/melhor-envio/connect",
        tiers: [OAUTH],
    },
    { routeId: "melhor-envio-callback", method: "GET", pathPattern: "/callback/melhor/envio", tiers: [OAUTH] },
    {
        routeId: "order-purchase-label",
        method: "POST",
        pathPattern: "/admin/orders/:id/purchase-label",
        tiers: [PAID_EXTERNAL_CALL],
    },
    {
        routeId: "order-label-print-link",
        method: "GET",
        pathPattern: "/admin/orders/:id/label-print-link",
        tiers: [PAID_EXTERNAL_CALL],
    },
];

export class RateLimitRouteRules {
    static resolve(method: string, path: string): RouteRateLimitRule | null {
        const normalizedMethod = method.toUpperCase();
        return (
            ROUTE_RULES.find(
                (rule) => rule.method === normalizedMethod && this.matchesPath(rule.pathPattern, path)
            ) ?? null
        );
    }

    private static matchesPath(pattern: string, path: string): boolean {
        const patternSegments = pattern.split("/").filter(Boolean);
        const pathSegments = path.split("/").filter(Boolean);
        if (patternSegments.length !== pathSegments.length) {
            return false;
        }
        return patternSegments.every((segment, index) => segment.startsWith(":") || segment === pathSegments[index]);
    }
}
