import { beforeEach, describe, expect, it } from "vitest";
import { ListOrdersForAdmin } from "../../../src/app/orders/useCase/ListOrdersForAdmin";
import { Order } from "../../../src/domain/entites/Order";
import { User } from "../../../src/domain/entites/User";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const buildUseCase = () => {
    const orderRepo = new InMemoryRepository<Order>();
    const userRepo = new InMemoryRepository<User>();
    const useCase = new ListOrdersForAdmin(orderRepo, userRepo);
    return { useCase, orderRepo, userRepo };
};

describe("ListOrdersForAdmin", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("lista pedidos pagos na aba 'paid' com dados do comprador", async () => {
        const buyer = User.build(createId, "joao@gmail.com", "joao");
        await context.userRepo.save(buyer);
        const paidOrder = Order.build(
            createId,
            buyer.id,
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        paidOrder.markAsPaid(paidOrder.totalCents);
        await context.orderRepo.save(paidOrder);
        const pendingOrder = Order.build(
            createId,
            buyer.id,
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        await context.orderRepo.save(pendingOrder);

        const output = await context.useCase.execute({ tab: "paid" });

        expect(output).toHaveLength(1);
        expect(output[0].id).toBe(paidOrder.id);
        expect(output[0].buyerEmail).toBe("joao@gmail.com");
    });

    it("lista pedidos pendentes, expirados e recusados juntos na aba 'pending'", async () => {
        const buyer = User.build(createId, "joao@gmail.com", "joao");
        await context.userRepo.save(buyer);
        const pending = Order.build(
            createId,
            buyer.id,
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        const rejected = Order.build(
            createId,
            buyer.id,
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        rejected.markAsRejected();
        await context.orderRepo.save(pending);
        await context.orderRepo.save(rejected);

        const output = await context.useCase.execute({ tab: "pending" });

        expect(output).toHaveLength(2);
    });

    it("lista estornos e chargebacks juntos na aba 'refunded'", async () => {
        const buyer = User.build(createId, "joao@gmail.com", "joao");
        await context.userRepo.save(buyer);
        const refunded = Order.build(
            createId,
            buyer.id,
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        refunded.markAsPaid(refunded.totalCents);
        refunded.markAsRefunded();
        await context.orderRepo.save(refunded);

        const output = await context.useCase.execute({ tab: "refunded" });

        expect(output).toHaveLength(1);
        expect(output[0].id).toBe(refunded.id);
    });

    it("recusa aba de pedidos desconhecida", async () => {
        await expect(context.useCase.execute({ tab: "inexistente" as never })).rejects.toThrow(BusinessRuleError);
        await expect(context.useCase.execute({ tab: "inexistente" as never })).rejects.toThrow(
            "Aba de pedidos inválida."
        );
    });
});
