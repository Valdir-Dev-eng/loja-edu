import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "../../../src/domain/entites/User";
import { ProductRouter } from "../../../src/infra/routers/ProductRouter";
import { CategoryRouter } from "../../../src/infra/routers/CategoryRouter";
import { ProductImageRouter } from "../../../src/infra/routers/ProductImageRouter";
import { OrderRouter } from "../../../src/infra/routers/OrderRouter";
import { AddressRouter } from "../../../src/infra/routers/AddressRouter";
import { AdminRouter } from "../../../src/infra/routers/AdminRouter";
import { ShippingLabelRouter } from "../../../src/infra/routers/ShippingLabelRouter";
import { MelhorEnvioRouter } from "../../../src/infra/routers/MelhorEnvioRouter";
import { DevRouter } from "../../../src/infra/routers/DevRouter";
import { OnboardingRouter } from "../../../src/infra/routers/OnboardingRouter";
import { ShippingRouter } from "../../../src/infra/routers/ShippingRouter";
import { WebhookRouter } from "../../../src/infra/routers/WebhookRouter";
import { ShippingValidator } from "../../../src/infra/validators/ShippingValidator";
import { middleWare, methodHttp } from "../../../src/infra/server/ServerPort";
import { buildAuthTestKit, buildReq, runChain } from "../../doubles/AuthTestKit";

const passthrough = (x: unknown) => x;

const STUB_PRODUCT_CONTROLLER = {
    create: async () => ({ id: "stub-product" }),
    update: async () => ({ id: "stub-product" }),
    delete: async () => {},
    getById: async () => ({ id: "stub-product" }),
    getAll: async () => [],
};
const STUB_PRODUCT_VALIDATOR = { validate: passthrough, validateUpdate: passthrough };

const STUB_CATEGORY_CONTROLLER = { create: async () => ({ id: "stub-category" }), list: async () => [] };
const STUB_CATEGORY_VALIDATOR = { validate: passthrough };

const STUB_PRODUCT_IMAGE_CONTROLLER = {
    upload: async () => [{ id: "stub-image" }],
    delete: async () => {},
    list: async () => [],
};

const STUB_ORDER_CONTROLLER = {
    checkout: async () => ({ id: "stub-order" }),
    myOrders: async () => [],
    paymentStatus: async () => ({ status: "pending" }),
    adminList: async () => [],
    processWebhook: async () => {},
};
const STUB_ORDER_VALIDATOR = { validateCheckout: passthrough };

const STUB_ADDRESS_CONTROLLER = {
    list: async () => [],
    create: async () => ({ id: "stub-address" }),
    delete: async () => {},
};
const STUB_ADDRESS_VALIDATOR = { validateCreate: passthrough };

const STUB_ADMIN_CONTROLLER = { listUsers: async () => [] };

const STUB_SHIPPING_LABEL_CONTROLLER = { purchase: async () => ({}), getPrintLink: async () => ({ url: "x" }) };

const STUB_MELHOR_ENVIO_CONTROLLER = { completeConnection: async () => {} };
const STUB_SHIPPING_GATEWAY = {
    buildAuthorizationUrl: () => "https://fake-melhor-envio.test/authorize",
    quote: async () => [],
    insertInCart: async () => ({ cartItemId: "x", priceCents: 0 }),
    purchase: async () => {},
    getPrintLink: async () => "https://fake/print",
    completeConnection: async () => {},
    isConnected: async () => true,
};

const STUB_DEV_CONTROLLER = { promoteMe: async () => ({ id: "stub-user", isAdmin: true }) };

const STUB_USER_AUTH_CONTROLLER_FOR_ONBOARDING = { completeOnboarding: async () => ({ id: "stub-user" }) };
const STUB_USER_VALIDATOR = { validateOnboarding: passthrough };

const STUB_SHIPPING_CONTROLLER = { quote: async () => [] };
const STUB_PAYMENT_GATEWAY = { validateWebhookSignature: () => true };

function buildApp() {
    const kit = buildAuthTestKit();
    new ProductRouter(kit.server, STUB_PRODUCT_CONTROLLER as any, STUB_PRODUCT_VALIDATOR as any, kit.authRouter);
    new CategoryRouter(kit.server, STUB_CATEGORY_CONTROLLER as any, STUB_CATEGORY_VALIDATOR as any, kit.authRouter);
    new ProductImageRouter(kit.server, STUB_PRODUCT_IMAGE_CONTROLLER as any, kit.authRouter);
    new OrderRouter(kit.server, STUB_ORDER_CONTROLLER as any, STUB_ORDER_VALIDATOR as any, kit.authRouter);
    new AddressRouter(kit.server, STUB_ADDRESS_CONTROLLER as any, STUB_ADDRESS_VALIDATOR as any, kit.authRouter);
    new AdminRouter(kit.server, STUB_ORDER_CONTROLLER as any, STUB_ADMIN_CONTROLLER as any, kit.authRouter);
    new ShippingLabelRouter(kit.server, STUB_SHIPPING_LABEL_CONTROLLER as any, kit.authRouter);
    new MelhorEnvioRouter(kit.server, STUB_MELHOR_ENVIO_CONTROLLER as any, STUB_SHIPPING_GATEWAY as any, kit.authRouter);
    new DevRouter(kit.server, STUB_DEV_CONTROLLER as any, kit.authRouter);
    new OnboardingRouter(kit.server, STUB_USER_AUTH_CONTROLLER_FOR_ONBOARDING as any, STUB_USER_VALIDATOR as any, kit.authRouter);
    new ShippingRouter(kit.server, STUB_SHIPPING_CONTROLLER as any, new ShippingValidator());
    new WebhookRouter(kit.server, STUB_ORDER_CONTROLLER as any, STUB_PAYMENT_GATEWAY as any);
    return kit;
}

function findHandlers(kit: ReturnType<typeof buildApp>, method: methodHttp, path: string): middleWare[] {
    const route = kit.server.registeredRoutes.find((r) => r.method === method && r.path === path);
    if (!route) {
        throw new Error(`Rota não encontrada nos testes: ${method.toUpperCase()} ${path}`);
    }
    return route.handlers;
}

interface AdminRoute {
    method: methodHttp;
    path: string;
}

interface SessionRoute {
    method: methodHttp;
    path: string;
}

interface PublicRoute {
    method: methodHttp;
    path: string;
}

// Excludes POST /admin/products/:id/images: it wires a real multer middleware, which
// needs a genuine multipart HTTP stream and can't run through a hand-built fake req/res —
// covered separately below by a wiring-only (reference equality) check instead.
const ADMIN_ROUTES: AdminRoute[] = [
    { method: "post", path: "/product/" },
    { method: "put", path: "/product/:id" },
    { method: "delete", path: "/product/:id" },
    { method: "post", path: "/categories" },
    { method: "delete", path: "/admin/products/:id/images/:imageId" },
    { method: "get", path: "/admin/orders" },
    { method: "get", path: "/admin/users" },
    { method: "post", path: "/admin/orders/:id/purchase-label" },
    { method: "get", path: "/admin/orders/:id/label-print-link" },
    { method: "get", path: "/admin/melhor-envio/connect" },
];

const SESSION_ONLY_ROUTES: SessionRoute[] = [
    { method: "get", path: "/addresses/my" },
    { method: "post", path: "/addresses" },
    { method: "delete", path: "/addresses/:id" },
    { method: "get", path: "/order/my" },
    { method: "get", path: "/order/:id/payment-status" },
    { method: "post", path: "/auth/onboarding" },
];

const PUBLIC_ROUTES_EXECUTABLE: PublicRoute[] = [
    { method: "get", path: "/product/:id" },
    { method: "get", path: "/product/" },
    { method: "get", path: "/categories" },
    { method: "get", path: "/product/:id/images" },
];

describe("Matriz de autorização — rotas ADMIN (só token de admin passa)", () => {
    let kit: ReturnType<typeof buildApp>;

    beforeEach(() => {
        kit = buildApp();
    });

    it.each(ADMIN_ROUTES)("$method $path: sem cookie de sessão -> 401, ninguém passa", async ({ method, path }) => {
        const handlers = findHandlers(kit, method, path);
        const req = buildReq(undefined, { params: { id: "any-id", imageId: "any-image-id" } });

        const res = await runChain(handlers, req);

        expect(res.statusCode).toBe(401);
    });

    it.each(ADMIN_ROUTES)(
        "$method $path: TOKEN DE USUÁRIO COMUM -> 403, admin-only barra usuário comum",
        async ({ method, path }) => {
            const handlers = findHandlers(kit, method, path);
            const user = await kit.createUser(UserRole.CUSTOMER);
            const token = kit.tokenFor(user);
            const req = buildReq(token, { params: { id: "any-id", imageId: "any-image-id" } });

            const res = await runChain(handlers, req);

            expect(res.statusCode).toBe(403);
        }
    );

    it.each(ADMIN_ROUTES)("$method $path: TOKEN DE ADMIN -> passa e chega no controller", async ({ method, path }) => {
        const handlers = findHandlers(kit, method, path);
        const admin = await kit.createUser(UserRole.ADMIN);
        const token = kit.tokenFor(admin);
        const req = buildReq(token, { params: { id: "any-id", imageId: "any-image-id" } });

        const res = await runChain(handlers, req);

        expect(res.statusCode).toBeLessThan(400);
    });

    it("POST /admin/products/:id/images: wiring — as duas primeiras camadas são requireSession e requireAdmin (não roda via fake req/res pois usa multer real)", () => {
        const handlers = findHandlers(kit, "post", "/admin/products/:id/images");

        expect(handlers[0]).toBe(kit.authRouter.requireSession);
        expect(handlers[1]).toBe(kit.authRouter.requireAdmin);
    });
});

describe("Matriz de autorização — rotas de USUÁRIO logado (qualquer sessão válida passa, sem exigir admin)", () => {
    let kit: ReturnType<typeof buildApp>;

    beforeEach(() => {
        kit = buildApp();
    });

    it.each(SESSION_ONLY_ROUTES)("$method $path: sem cookie de sessão -> 401", async ({ method, path }) => {
        const handlers = findHandlers(kit, method, path);
        const req = buildReq(undefined, { params: { id: "any-id" } });

        const res = await runChain(handlers, req);

        expect(res.statusCode).toBe(401);
    });

    it.each(SESSION_ONLY_ROUTES)(
        "$method $path: usuário comum autenticado -> passa (não precisa ser admin)",
        async ({ method, path }) => {
            const handlers = findHandlers(kit, method, path);
            const user = await kit.createUser(UserRole.CUSTOMER);
            const token = kit.tokenFor(user);
            const req = buildReq(token, { params: { id: "any-id" } });

            const res = await runChain(handlers, req);

            expect(res.statusCode).toBeLessThan(400);
        }
    );

    it.each(SESSION_ONLY_ROUTES)("$method $path: admin autenticado também passa (session-only não restringe por papel)", async ({
        method,
        path,
    }) => {
        const handlers = findHandlers(kit, method, path);
        const admin = await kit.createUser(UserRole.ADMIN);
        const token = kit.tokenFor(admin);
        const req = buildReq(token, { params: { id: "any-id" } });

        const res = await runChain(handlers, req);

        expect(res.statusCode).toBeLessThan(400);
    });
});

describe("Matriz de autorização — GET /dev/promote-me (sessão + só existe em ambiente de desenvolvimento)", () => {
    let kit: ReturnType<typeof buildApp>;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        kit = buildApp();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it("sem cookie de sessão -> 401, mesmo em desenvolvimento", async () => {
        process.env.NODE_ENV = "development";
        const handlers = findHandlers(kit, "get", "/dev/promote-me");

        const res = await runChain(handlers, buildReq(undefined));

        expect(res.statusCode).toBe(401);
    });

    it("com sessão válida e NODE_ENV=development -> passa", async () => {
        process.env.NODE_ENV = "development";
        const handlers = findHandlers(kit, "get", "/dev/promote-me");
        const user = await kit.createUser(UserRole.CUSTOMER);
        const token = kit.tokenFor(user);

        const res = await runChain(handlers, buildReq(token));

        expect(res.statusCode).toBeLessThan(400);
    });

    it("com sessão válida mas fora de desenvolvimento (produção) -> 404, mesmo autenticado, para não vazar promoção de admin em produção", async () => {
        process.env.NODE_ENV = "production";
        const handlers = findHandlers(kit, "get", "/dev/promote-me");
        const user = await kit.createUser(UserRole.CUSTOMER);
        const token = kit.tokenFor(user);

        const res = await runChain(handlers, buildReq(token));

        expect(res.statusCode).toBe(404);
    });
});

describe("Matriz de autorização — POST /order/checkout (sessão + onboarding concluído)", () => {
    let kit: ReturnType<typeof buildApp>;

    beforeEach(() => {
        kit = buildApp();
    });

    it("sem cookie de sessão -> 401", async () => {
        const handlers = findHandlers(kit, "post", "/order/checkout");

        const res = await runChain(handlers, buildReq(undefined));

        expect(res.statusCode).toBe(401);
    });

    it("sessão válida mas onboarding pendente -> 403 com details.onboardingPending", async () => {
        const handlers = findHandlers(kit, "post", "/order/checkout");
        const user = await kit.createUser(UserRole.CUSTOMER, false);
        const token = kit.tokenFor(user);

        const res = await runChain(handlers, buildReq(token));

        expect(res.statusCode).toBe(403);
        expect((res.jsonBody as any).details).toEqual({ onboardingPending: true });
    });

    it("sessão válida com onboarding concluído -> passa", async () => {
        const handlers = findHandlers(kit, "post", "/order/checkout");
        const user = await kit.createUser(UserRole.CUSTOMER, true);
        const token = kit.tokenFor(user);

        const res = await runChain(handlers, buildReq(token));

        expect(res.statusCode).toBeLessThan(400);
    });
});

describe("Matriz de autorização — usuário que acabou de logar, com cadastro incompleto (fluxo real de onboarding)", () => {
    let kit: ReturnType<typeof buildApp>;

    beforeEach(() => {
        kit = buildApp();
    });

    it.each(SESSION_ONLY_ROUTES)(
        "$method $path: token válido de usuário com onboarding pendente ainda passa — só o checkout é bloqueado",
        async ({ method, path }) => {
            const handlers = findHandlers(kit, method, path);
            const freshUser = await kit.createUser(UserRole.CUSTOMER, false);
            const token = kit.tokenFor(freshUser);
            const req = buildReq(token, { params: { id: "any-id" } });

            const res = await runChain(handlers, req);

            expect(res.statusCode).toBeLessThan(400);
        }
    );

    it.each(PUBLIC_ROUTES_EXECUTABLE)(
        "$method $path: usuário com onboarding pendente navega o catálogo público normalmente",
        async ({ method, path }) => {
            const handlers = findHandlers(kit, method, path);
            const freshUser = await kit.createUser(UserRole.CUSTOMER, false);
            const token = kit.tokenFor(freshUser);
            const req = buildReq(token, { params: { id: "any-id" } });

            const res = await runChain(handlers, req);

            expect(res.statusCode).toBeLessThan(400);
        }
    );

    it("é bloqueado especificamente e só em /order/checkout, com um sinal explícito (onboardingPending) pro frontend redirecionar", async () => {
        const handlers = findHandlers(kit, "post", "/order/checkout");
        const freshUser = await kit.createUser(UserRole.CUSTOMER, false);
        const token = kit.tokenFor(freshUser);

        const res = await runChain(handlers, buildReq(token));

        expect(res.statusCode).toBe(403);
        expect((res.jsonBody as any).details).toEqual({ onboardingPending: true });
    });

    it("consegue completar o próprio onboarding (POST /auth/onboarding) exatamente porque essa rota não exige requireCompletedOnboarding", () => {
        const handlers = findHandlers(kit, "post", "/auth/onboarding");

        expect(handlers[0]).toBe(kit.authRouter.requireSession);
        expect(handlers).not.toContain(kit.authRouter.requireCompletedOnboarding);
        expect(handlers).not.toContain(kit.authRouter.requireAdmin);
    });
});

describe("Matriz de autorização — rotas PÚBLICAS (funcionam com ou sem token, para qualquer papel)", () => {
    let kit: ReturnType<typeof buildApp>;

    beforeEach(() => {
        kit = buildApp();
    });

    it.each(PUBLIC_ROUTES_EXECUTABLE)("$method $path: sem nenhum cookie -> passa normalmente", async ({ method, path }) => {
        const handlers = findHandlers(kit, method, path);
        const req = buildReq(undefined, { params: { id: "any-id" } });

        const res = await runChain(handlers, req);

        expect(res.statusCode).toBeLessThan(400);
    });

    it.each(PUBLIC_ROUTES_EXECUTABLE)(
        "$method $path: com cookie de usuário comum -> continua passando igual",
        async ({ method, path }) => {
            const handlers = findHandlers(kit, method, path);
            const user = await kit.createUser(UserRole.CUSTOMER);
            const token = kit.tokenFor(user);
            const req = buildReq(token, { params: { id: "any-id" } });

            const res = await runChain(handlers, req);

            expect(res.statusCode).toBeLessThan(400);
        }
    );

    it.each(PUBLIC_ROUTES_EXECUTABLE)(
        "$method $path: com cookie de admin -> continua passando igual (rota pública não distingue papel)",
        async ({ method, path }) => {
            const handlers = findHandlers(kit, method, path);
            const admin = await kit.createUser(UserRole.ADMIN);
            const token = kit.tokenFor(admin);
            const req = buildReq(token, { params: { id: "any-id" } });

            const res = await runChain(handlers, req);

            expect(res.statusCode).toBeLessThan(400);
        }
    );

    it.each(PUBLIC_ROUTES_EXECUTABLE)(
        "$method $path: com um token inválido/expirado presente -> ainda assim passa (rota pública nunca olha pro cookie)",
        async ({ method, path }) => {
            const handlers = findHandlers(kit, method, path);
            kit.tokenManager.failNextVerifyWith(new Error("jwt malformed"));
            const req = buildReq("token-invalido-qualquer", { params: { id: "any-id" } });

            const res = await runChain(handlers, req);

            expect(res.statusCode).toBeLessThan(400);
        }
    );

    it("POST /shipping/quote é pública: não inclui requireSession nem requireAdmin", () => {
        const handlers = findHandlers(kit, "post", "/shipping/quote");

        expect(handlers).not.toContain(kit.authRouter.requireSession);
        expect(handlers).not.toContain(kit.authRouter.requireAdmin);
    });

    it("GET /callback/melhor/envio é pública: não inclui requireSession nem requireAdmin", () => {
        const handlers = findHandlers(kit, "get", "/callback/melhor/envio");

        expect(handlers).not.toContain(kit.authRouter.requireSession);
        expect(handlers).not.toContain(kit.authRouter.requireAdmin);
    });

    it("POST /webhooks/mercadopago é pública: não inclui requireSession nem requireAdmin (é protegida por assinatura, não por cookie de usuário)", () => {
        const handlers = findHandlers(kit, "post", "/webhooks/mercadopago");

        expect(handlers).not.toContain(kit.authRouter.requireSession);
        expect(handlers).not.toContain(kit.authRouter.requireAdmin);
    });

    it("GET /admin/melhor-envio/connect NÃO é pública: exige sessão + admin, diferente do seu callback", () => {
        const handlers = findHandlers(kit, "get", "/admin/melhor-envio/connect");

        expect(handlers[0]).toBe(kit.authRouter.requireSession);
        expect(handlers[1]).toBe(kit.authRouter.requireAdmin);
    });
});

describe("Matriz de autorização — nenhuma rota admin é acidentalmente pública, nenhuma rota pública ganhou um guard sem querer", () => {
    it("toda rota admin listada realmente começa com [requireSession, requireAdmin], nessa ordem", () => {
        const kit = buildApp();

        for (const { method, path } of [...ADMIN_ROUTES, { method: "post" as methodHttp, path: "/admin/products/:id/images" }]) {
            const handlers = findHandlers(kit, method, path);
            expect(handlers[0], `${method.toUpperCase()} ${path} deveria começar com requireSession`).toBe(
                kit.authRouter.requireSession
            );
            expect(handlers[1], `${method.toUpperCase()} ${path} deveria ter requireAdmin em seguida`).toBe(
                kit.authRouter.requireAdmin
            );
        }
    });

    it("toda rota session-only listada começa com requireSession e NÃO tem requireAdmin em lugar nenhum da cadeia", () => {
        const kit = buildApp();

        for (const { method, path } of SESSION_ONLY_ROUTES) {
            const handlers = findHandlers(kit, method, path);
            expect(handlers[0], `${method.toUpperCase()} ${path} deveria começar com requireSession`).toBe(
                kit.authRouter.requireSession
            );
            expect(handlers).not.toContain(kit.authRouter.requireAdmin);
        }
    });

    it("nenhuma rota pública executável tem requireSession/requireAdmin na cadeia", () => {
        const kit = buildApp();

        for (const { method, path } of PUBLIC_ROUTES_EXECUTABLE) {
            const handlers = findHandlers(kit, method, path);
            expect(handlers).not.toContain(kit.authRouter.requireSession);
            expect(handlers).not.toContain(kit.authRouter.requireAdmin);
        }
    });
});
