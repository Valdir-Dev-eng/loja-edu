import { beforeEach, describe, expect, it } from "vitest";
import { GetShippingLabelPrintLink } from "../../../src/app/shipping/useCase/GetShippingLabelPrintLink";
import { Order } from "../../../src/domain/entites/Order";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeShippingGatewayPort } from "../../doubles/FakeShippingGatewayPort";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const buildUseCase = () => {
    const orderRepo = new InMemoryRepository<Order>();
    const shippingGateway = new FakeShippingGatewayPort();
    const useCase = new GetShippingLabelPrintLink(orderRepo, shippingGateway);
    return { useCase, orderRepo, shippingGateway };
};

describe("GetShippingLabelPrintLink", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("devolve o link de impressão do pedido com etiqueta já comprada", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            1500,
            1
        );
        order.attachShipping(1, "cart-item-1");
        await context.orderRepo.save(order);
        context.shippingGateway.queuePrintLink("https://sandbox.melhorenvio.com.br/imprimir/abc123");

        const output = await context.useCase.execute(order.id);

        expect(output.url).toBe("https://sandbox.melhorenvio.com.br/imprimir/abc123");
        expect(context.shippingGateway.printedCartItemIds).toEqual(["cart-item-1"]);
    });

    it("recusa pedido inexistente", async () => {
        await expect(context.useCase.execute("id-inexistente")).rejects.toThrow(NotFoundError);
    });

    it("recusa pedido sem etiqueta de frete comprada ainda", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            1500,
            1
        );
        await context.orderRepo.save(order);

        await expect(context.useCase.execute(order.id)).rejects.toThrow(BusinessRuleError);
        await expect(context.useCase.execute(order.id)).rejects.toThrow(
            "Pedido ainda não tem etiqueta de frete comprada."
        );
    });
});
