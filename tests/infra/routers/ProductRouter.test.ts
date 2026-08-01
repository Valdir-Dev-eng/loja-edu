import { describe, expect, it } from "vitest";
import { ProductRouter } from "../../../src/infra/routers/ProductRouter";
import { ProductValidator } from "../../../src/infra/validators/ProductValidator";
import { UserAuthRouter } from "../../../src/infra/routers/UserAuthRouter";
import { ZodDTOBuilderAndValidator } from "../../../src/infra/shared/validators/ZodDTOBuilderAndValidator";
import { FakeServerPort } from "../../doubles/FakeServerPort";
import { FakeOAuthProviderPort } from "../../doubles/FakeOAuthProviderPort";
import { IRequest, IResponse } from "../../../src/infra/server/ServerPort";

class FakeProductController {
    public updateCalls: { id: string; input: unknown }[] = [];

    async update(id: string, input: unknown) {
        this.updateCalls.push({ id, input });
        return { id };
    }
}

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

const buildRouter = () => {
    const server = new FakeServerPort();
    const validator = new ProductValidator(new ZodDTOBuilderAndValidator());
    const authRouter = new UserAuthRouter(server, {} as any, new FakeOAuthProviderPort());
    const productController = new FakeProductController();
    const router = new ProductRouter(server, productController as any, validator, authRouter);
    return { router, productController };
};

describe("ProductRouter", () => {
    describe("validatorProductUpdateInput", () => {
        it("recusa peso negativo com 400 e details, sem chamar next nem o Controller", async () => {
            const { router, productController } = buildRouter();
            const req = { body: { weight: -1 } } as IRequest;
            const res = new FakeResponse();
            let nextCalled = false;

            await (router as any).validatorProductUpdateInput(req, res, () => {
                nextCalled = true;
            });

            expect(res.statusCode).toBe(400);
            expect((res.jsonBody as any).details.weight).toBeTruthy();
            expect(nextCalled).toBe(false);
            expect(productController.updateCalls).toHaveLength(0);
        });

        it("recusa preço em formato de texto com 400, sem chamar next nem o Controller", async () => {
            const { router, productController } = buildRouter();
            const req = { body: { priceCents: "carissimo" } } as IRequest;
            const res = new FakeResponse();
            let nextCalled = false;

            await (router as any).validatorProductUpdateInput(req, res, () => {
                nextCalled = true;
            });

            expect(res.statusCode).toBe(400);
            expect(nextCalled).toBe(false);
            expect(productController.updateCalls).toHaveLength(0);
        });

        it("aceita atualização parcial válida e injeta o input validado na requisição", async () => {
            const { router } = buildRouter();
            const req = { body: { stock: 5 } } as IRequest;
            const res = new FakeResponse();
            let nextCalled = false;

            await (router as any).validatorProductUpdateInput(req, res, () => {
                nextCalled = true;
            });

            expect(nextCalled).toBe(true);
            expect((req as any).productUpdateInput).toEqual({ stock: 5 });
        });
    });

    describe("updateProduct", () => {
        it("repassa ao Controller o input já validado, nunca o corpo cru da requisição", async () => {
            const { router, productController } = buildRouter();
            const req = { params: { id: "product-1" }, productUpdateInput: { stock: 5 } } as unknown as IRequest;
            const res = new FakeResponse();

            await (router as any).updateProduct(req, res);

            expect(productController.updateCalls).toEqual([{ id: "product-1", input: { stock: 5 } }]);
            expect(res.statusCode).toBe(200);
        });
    });
});
