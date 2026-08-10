import { RateLimitTierConfig } from "../../domain/rateLimit/RateLimitPolicy";

export interface RouteRateLimitRule {
    routeId: string;
    method: string;
    pathPattern: string;
    tiers: RateLimitTierConfig[];
}

const ONE_MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

const OAUTH: RateLimitTierConfig = {
    tierId: "oauth",
    minIntervalMs: 1000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 10,
    blockDurationMs: FIVE_MINUTES_MS,
    fallbackPolicy: "in-memory",
};

const AUTHENTICATED_READ: RateLimitTierConfig = {
    tierId: "authenticated-read",
    minIntervalMs: 1000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 60,
    blockDurationMs: FIVE_MINUTES_MS,
    fallbackPolicy: "in-memory",
};

// /auth/me nao e' uma acao deliberada do usuario — todo Server Component que
// depende de sessao chama getSessionUser(), e o Next.js faz prefetch
// automatico de todo <Link> visivel na tela, cada um disparando seu proprio
// render (e portanto seu proprio /auth/me). minIntervalMs:1000 da
// AUTHENTICATED_READ bloqueava a segunda chamada quase sempre — e
// getSessionUser() trata qualquer resposta nao-200 (429 incluso) como
// "deslogado", entao o header piscava pra visitante a cada navegacao com
// mais de um link visivel. Sem o piso por-segundo, so a janela de 5min
// protege — adequada pra uma checagem barata (JWT + cache) chamada
// implicitamente, nao uma acao sensivel.
const SESSION_CHECK: RateLimitTierConfig = {
    tierId: "session-check",
    minIntervalMs: 0,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 300,
    blockDurationMs: FIVE_MINUTES_MS,
    fallbackPolicy: "in-memory",
};

const GENERIC_WRITE: RateLimitTierConfig = {
    tierId: "generic-write",
    minIntervalMs: 3000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 20,
    blockDurationMs: FIVE_MINUTES_MS,
    fallbackPolicy: "in-memory",
};

// Adicionar/editar/remover item do carrinho e' uma sequencia natural de
// cliques rapidos — varios "Adicionar" em produtos diferentes na mesma tela,
// nao uma acao isolada como criar endereco ou categoria. O bucket de rate
// limit e' por ROTA, nao por produto (ver RateLimitMiddleware), entao todo
// POST /cart/items do mesmo usuario cai no mesmo balde independente de qual
// produto — com GENERIC_WRITE (minIntervalMs: 3000) o segundo clique em
// menos de 3s ja tomava 429. Sem piso por-segundo, janela de 1min ainda
// generosa o bastante pra travar um script martelando o carrinho.
const CART_MUTATION: RateLimitTierConfig = {
    tierId: "cart-mutation",
    minIntervalMs: 0,
    windowMs: ONE_MINUTE_MS,
    maxRequestsInWindow: 40,
    blockDurationMs: ONE_MINUTE_MS,
    fallbackPolicy: "in-memory",
};

export const PAID_EXTERNAL_CALL: RateLimitTierConfig = {
    tierId: "paid-external-call",
    minIntervalMs: 5000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 5,
    blockDurationMs: TEN_MINUTES_MS,
    fallbackPolicy: "in-memory",
};

// So consumida em cache MISS dentro de CalculateShipping (a rota em si fica
// sem tier abaixo — ver comentario la). Nao reaproveita PAID_EXTERNAL_CALL
// de proposito: um cliente real comparando frete entre os enderecos salvos
// no checkout facilmente gera 3-4 misses (CEPs diferentes) em menos de um
// minuto, e o piso de 5s da PAID_EXTERNAL_CALL barrava isso quase sempre.
// 10 misses reais/min ainda protege o Melhor Envio de um script martelando
// CEP aleatorio, sem punir uso normal.
export const SHIPPING_QUOTE_GATEWAY: RateLimitTierConfig = {
    tierId: "shipping-quote-gateway",
    minIntervalMs: 0,
    windowMs: ONE_MINUTE_MS,
    maxRequestsInWindow: 10,
    blockDurationMs: ONE_MINUTE_MS,
    fallbackPolicy: "in-memory",
};

// O access token dura so 15min e apiClient re-executa a MESMA chamada
// automaticamente apos um refresh de sessao (ver web/src/lib/api-client.ts)
// — entao um checkout que bate 401 (sessao expirou no pior momento) e o
// retry legitimo do proprio app acontecem as vezes com menos de 1s de
// diferenca. PAID_EXTERNAL_CALL (minIntervalMs: 5000) derrubava esse retry
// sempre, fazendo o cliente perder a compra por causa da propria sessao —
// nao de abuso. Sem piso por-segundo; a janela de 1min/5 tentativas ainda
// impede um script chamando checkout em loop.
export const CHECKOUT_ATTEMPT: RateLimitTierConfig = {
    tierId: "checkout-attempt",
    minIntervalMs: 0,
    windowMs: ONE_MINUTE_MS,
    maxRequestsInWindow: 5,
    blockDurationMs: ONE_MINUTE_MS,
    fallbackPolicy: "in-memory",
};

const IMAGE_UPLOAD: RateLimitTierConfig = {
    tierId: "image-upload",
    minIntervalMs: 2000,
    windowMs: FIVE_MINUTES_MS,
    maxRequestsInWindow: 10,
    blockDurationMs: TEN_MINUTES_MS,
    fallbackPolicy: "in-memory",
};

const ROUTE_RULES: RouteRateLimitRule[] = [
    { routeId: "auth-google-redirect", method: "GET", pathPattern: "/auth/google", tiers: [OAUTH] },
    { routeId: "auth-google-callback", method: "GET", pathPattern: "/auth/google/callback", tiers: [OAUTH] },
    { routeId: "auth-logout", method: "POST", pathPattern: "/auth/logout", tiers: [AUTHENTICATED_READ] },
    { routeId: "auth-refresh", method: "POST", pathPattern: "/auth/refresh", tiers: [AUTHENTICATED_READ] },
    { routeId: "auth-me", method: "GET", pathPattern: "/auth/me", tiers: [SESSION_CHECK] },
    { routeId: "auth-onboarding", method: "POST", pathPattern: "/auth/onboarding", tiers: [GENERIC_WRITE] },
    { routeId: "cart-list", method: "GET", pathPattern: "/cart", tiers: [AUTHENTICATED_READ] },
    { routeId: "cart-item-add", method: "POST", pathPattern: "/cart/items", tiers: [CART_MUTATION] },
    { routeId: "cart-item-update", method: "PUT", pathPattern: "/cart/items/:productId", tiers: [CART_MUTATION] },
    { routeId: "cart-item-delete", method: "DELETE", pathPattern: "/cart/items/:productId", tiers: [CART_MUTATION] },
    { routeId: "address-list", method: "GET", pathPattern: "/addresses/my", tiers: [AUTHENTICATED_READ] },
    { routeId: "address-create", method: "POST", pathPattern: "/addresses", tiers: [GENERIC_WRITE] },
    { routeId: "address-delete", method: "DELETE", pathPattern: "/addresses/:id", tiers: [GENERIC_WRITE] },
    { routeId: "product-create", method: "POST", pathPattern: "/product/", tiers: [GENERIC_WRITE] },
    { routeId: "product-update", method: "PUT", pathPattern: "/product/:id", tiers: [GENERIC_WRITE] },
    { routeId: "product-delete", method: "DELETE", pathPattern: "/product/:id", tiers: [GENERIC_WRITE] },
    { routeId: "product-get-by-id", method: "GET", pathPattern: "/product/:id", tiers: [] },
    { routeId: "product-list", method: "GET", pathPattern: "/product/", tiers: [] },
    { routeId: "order-checkout", method: "POST", pathPattern: "/order/checkout", tiers: [CHECKOUT_ATTEMPT] },
    { routeId: "order-my", method: "GET", pathPattern: "/order/my", tiers: [AUTHENTICATED_READ] },
    {
        routeId: "order-payment-status",
        method: "GET",
        pathPattern: "/order/:id/payment-status",
        tiers: [AUTHENTICATED_READ],
    },
    { routeId: "order-realtime-ticket", method: "GET", pathPattern: "/order/realtime-ticket", tiers: [AUTHENTICATED_READ] },
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
    // Sem tier aqui de proposito: CalculateShipping serve a maioria das
    // chamadas do cache (mesmo CEP+carrinho, 5min de TTL) — se o limite
    // fosse aplicado nesta camada de middleware, um cache HIT contaria como
    // se tivesse batido no Melhor Envio mesmo sem custar nada. PAID_EXTERNAL_CALL
    // e' consumido dentro do proprio use case, so num cache MISS (ver
    // CalculateShipping.ts), que e' exatamente o que essa tier deveria
    // proteger.
    { routeId: "shipping-quote", method: "POST", pathPattern: "/shipping/quote", tiers: [] },
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
