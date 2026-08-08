import { beforeEach, describe, expect, it } from "vitest";
import { GetOrderPaymentStatus } from "../../../src/app/orders/useCase/GetOrderPaymentStatus";
import { ProcessPaymentWebhook } from "../../../src/app/orders/useCase/ProcessPaymentWebhook";
import { Order, OrderStatus } from "../../../src/domain/entites/Order";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { PaymentStatus } from "../../../src/domain/payment/PaymentGatewayPort";
import { OrderRepository } from "../../../src/infra/repository/OrderRepository";
import { ProductRepository } from "../../../src/infra/repository/ProductRepository";
import { TestWithMemoryDataAcess } from "../../doubles/TestWithMemoryDataAcess";
import { FakePaymentGatewayPort } from "../../doubles/FakePaymentGatewayPort";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

// Mesmo motivo do ProcessPaymentWebhook.test.ts: precisa de repos reais sobre
// um DataAccessPort de verdade, ja que ProcessPaymentWebhook (usado aqui como
// fallback de reconciliacao) depende de dataAccess.transaction().
const buildUseCase = () => {
    const db = new TestWithMemoryDataAcess();
    const orderRepo = new OrderRepository(db);
    const productRepo = new ProductRepository(db);
    const paymentGateway = new FakePaymentGatewayPort();
    const processPaymentWebhook = new ProcessPaymentWebhook(orderRepo, productRepo, paymentGateway, db);
    const useCase = new GetOrderPaymentStatus(orderRepo, processPaymentWebhook);
    return { useCase, orderRepo, productRepo, paymentGateway };
};

describe("GetOrderPaymentStatus", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("retorna o status do pedido do próprio usuário", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        await context.orderRepo.save(order);

        const output = await context.useCase.execute({ orderId: order.id, userId: "user-1" });

        expect(output).toEqual({ orderId: order.id, status: OrderStatus.PENDING_PAYMENT });
    });

    it("recusa com NotFoundError quando o pedido não existe", async () => {
        await expect(context.useCase.execute({ orderId: "id-inexistente", userId: "user-1" })).rejects.toThrow(
            NotFoundError
        );
    });

    it("recusa com NotFoundError (nunca ForbiddenError) quando o pedido é de outro usuário", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        await context.orderRepo.save(order);

        await expect(context.useCase.execute({ orderId: order.id, userId: "user-2" })).rejects.toThrow(
            NotFoundError
        );
        await expect(context.useCase.execute({ orderId: order.id, userId: "user-2" })).rejects.toThrow(
            "Pedido não encontrado."
        );
    });

    it("reconsulta o gateway e atualiza o status quando o pedido ainda está pendente (fallback ao webhook)", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        order.attachPayment("mp-payment-1");
        await context.orderRepo.save(order);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.APPROVED,
            paidAmountCents: order.totalCents,
        });

        const output = await context.useCase.execute({ orderId: order.id, userId: "user-1" });

        expect(output.status).toBe(OrderStatus.PAID);
        expect(context.paymentGateway.consultedPaymentIds).toEqual(["mp-payment-1"]);
    });

    it("não reconsulta o gateway quando o pedido já não está mais pendente", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        order.attachPayment("mp-payment-1");
        order.markAsPaid(order.totalCents);
        await context.orderRepo.save(order);

        const output = await context.useCase.execute({ orderId: order.id, userId: "user-1" });

        expect(output.status).toBe(OrderStatus.PAID);
        expect(context.paymentGateway.consultedPaymentIds).toEqual([]);
    });

    it("não reconsulta o gateway quando o pedido ainda não tem pagamento vinculado", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        await context.orderRepo.save(order);

        const output = await context.useCase.execute({ orderId: order.id, userId: "user-1" });

        expect(output.status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(context.paymentGateway.consultedPaymentIds).toEqual([]);
    });

    it("devolve o status salvo sem lançar erro quando a reconsulta ao gateway falha", async () => {
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            500
        );
        order.attachPayment("mp-payment-1");
        await context.orderRepo.save(order);
        context.paymentGateway.failNextStatusCheck();

        const output = await context.useCase.execute({ orderId: order.id, userId: "user-1" });

        expect(output.status).toBe(OrderStatus.PENDING_PAYMENT);
    });
});
