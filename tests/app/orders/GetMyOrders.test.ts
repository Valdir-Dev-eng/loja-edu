import { beforeEach, describe, expect, it } from "vitest";
import { GetMyOrders } from "../../../src/app/orders/useCase/GetMyOrders";
import { Order } from "../../../src/domain/entites/Order";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const buildUseCase = () => {
    const orderRepo = new InMemoryRepository<Order>();
    const useCase = new GetMyOrders(orderRepo);
    return { useCase, orderRepo };
};

describe("GetMyOrders", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("retorna apenas os pedidos do usuário informado, com total exibível", async () => {
        const myOrder = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 2 }],
            500
        );
        const otherOrder = Order.build(
            createId,
            "user-2",
            "address-2",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        await context.orderRepo.save(myOrder);
        await context.orderRepo.save(otherOrder);

        const output = await context.useCase.execute("user-1");

        expect(output).toHaveLength(1);
        expect(output[0].id).toBe(myOrder.id);
        expect(output[0].totalDisplay).toBe("R$ 39,80");
        expect(output[0].items[0].priceDisplay).toBe("R$ 19,90");
    });

    it("retorna lista vazia quando o usuário não possui pedidos", async () => {
        const output = await context.useCase.execute("user-sem-pedidos");

        expect(output).toEqual([]);
    });
});
