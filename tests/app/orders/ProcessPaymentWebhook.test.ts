import { beforeEach, describe, expect, it } from "vitest";
import { ProcessPaymentWebhook } from "../../../src/app/orders/useCase/ProcessPaymentWebhook";
import { Order, OrderStatus } from "../../../src/domain/entites/Order";
import { Product } from "../../../src/domain/entites/Product";
import { ConflictError } from "../../../src/domain/errors/ConflictError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { PaymentStatus } from "../../../src/domain/payment/PaymentGatewayPort";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakePaymentGatewayPort } from "../../doubles/FakePaymentGatewayPort";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const buildUseCase = () => {
    const orderRepo = new InMemoryRepository<Order>();
    const productRepo = new InMemoryRepository<Product>();
    const paymentGateway = new FakePaymentGatewayPort();
    const useCase = new ProcessPaymentWebhook(orderRepo, productRepo, paymentGateway);
    return { useCase, orderRepo, productRepo, paymentGateway };
};

const buildPendingOrder = async (context: ReturnType<typeof buildUseCase>, quantity = 2) => {
    const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
    await context.productRepo.save(product);
    const order = Order.build(
        createId,
        "user-1",
        "address-1",
        [{ productId: product.id, productName: product.name, priceCents: 1990, quantity }],
        500
    );
    order.attachPayment("mp-payment-1");
    await context.orderRepo.save(order);
    return { order, product };
};

describe("ProcessPaymentWebhook", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("marca o pedido como pago quando o valor pago confere com o total", async () => {
        const { order } = await buildPendingOrder(context);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.APPROVED,
            paidAmountCents: order.totalCents,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });

        const persisted = await context.orderRepo.findById(order.id);
        expect(persisted?.status).toBe(OrderStatus.PAID);
    });

    it("sempre reconsulta o Mercado Pago em vez de confiar no corpo do webhook", async () => {
        const { order } = await buildPendingOrder(context);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.APPROVED,
            paidAmountCents: order.totalCents,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });

        expect(context.paymentGateway.consultedPaymentIds).toEqual(["mp-payment-1"]);
    });

    it("não marca como pago quando o valor pago diverge do total do pedido", async () => {
        const { order } = await buildPendingOrder(context);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.APPROVED,
            paidAmountCents: order.totalCents - 100,
        });

        await expect(context.useCase.execute({ externalPaymentId: "mp-payment-1" })).rejects.toThrow(
            "Valor pago não corresponde ao total do pedido."
        );
        const persisted = await context.orderRepo.findById(order.id);
        expect(persisted?.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it("é idempotente: processar o mesmo evento aprovado duas vezes não muda nada na segunda", async () => {
        const { order } = await buildPendingOrder(context);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.APPROVED,
            paidAmountCents: order.totalCents,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });
        await expect(context.useCase.execute({ externalPaymentId: "mp-payment-1" })).resolves.toBeUndefined();

        const persisted = await context.orderRepo.findById(order.id);
        expect(persisted?.status).toBe(OrderStatus.PAID);
    });

    it("devolve o estoque quando o pagamento é recusado", async () => {
        const { order, product } = await buildPendingOrder(context, 3);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.REJECTED,
            paidAmountCents: 0,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });

        const persistedOrder = await context.orderRepo.findById(order.id);
        const persistedProduct = await context.productRepo.findById(product.id);
        expect(persistedOrder?.status).toBe(OrderStatus.REJECTED);
        expect(persistedProduct?.stock).toBe(10 + 3);
    });

    it("devolve o estoque quando o pagamento é cancelado", async () => {
        const { order, product } = await buildPendingOrder(context, 4);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.CANCELLED,
            paidAmountCents: 0,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });

        const persistedProduct = await context.productRepo.findById(product.id);
        expect(persistedProduct?.stock).toBe(10 + 4);
    });

    it("é idempotente também para cancelamento: não devolve estoque duas vezes", async () => {
        const { order, product } = await buildPendingOrder(context, 2);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.CANCELLED,
            paidAmountCents: 0,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });
        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });

        const persistedProduct = await context.productRepo.findById(product.id);
        expect(persistedProduct?.stock).toBe(10 + 2);
    });

    it("marca como estornado um pedido pago quando o Mercado Pago notifica reembolso", async () => {
        const { order } = await buildPendingOrder(context);
        order.markAsPaid(order.totalCents);
        await context.orderRepo.update(order.id, { status: order.status });
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.REFUNDED,
            paidAmountCents: order.totalCents,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });

        const persisted = await context.orderRepo.findById(order.id);
        expect(persisted?.status).toBe(OrderStatus.REFUNDED);
    });

    it("recusa estornar um pedido que ainda não foi pago", async () => {
        const { order } = await buildPendingOrder(context);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.REFUNDED,
            paidAmountCents: order.totalCents,
        });

        await expect(context.useCase.execute({ externalPaymentId: "mp-payment-1" })).rejects.toThrow(ConflictError);
    });

    it("recusa aprovar pagamento de um pedido que já não está mais pendente", async () => {
        const { order } = await buildPendingOrder(context);
        order.markAsCancelled();
        await context.orderRepo.update(order.id, { status: order.status });
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.APPROVED,
            paidAmountCents: order.totalCents,
        });

        await expect(context.useCase.execute({ externalPaymentId: "mp-payment-1" })).rejects.toThrow(ConflictError);
        await expect(context.useCase.execute({ externalPaymentId: "mp-payment-1" })).rejects.toThrow(
            "Pedido não está mais aguardando pagamento."
        );
    });

    it("recusa processar webhook de pedido inexistente", async () => {
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: "pedido-inexistente",
            status: PaymentStatus.APPROVED,
            paidAmountCents: 100,
        });

        await expect(context.useCase.execute({ externalPaymentId: "mp-payment-1" })).rejects.toThrow(NotFoundError);
        await expect(context.useCase.execute({ externalPaymentId: "mp-payment-1" })).rejects.toThrow(
            "Pedido não encontrado."
        );
    });

    it("não faz nada quando o pagamento ainda está pendente", async () => {
        const { order } = await buildPendingOrder(context);
        context.paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-1",
            orderId: order.id,
            status: PaymentStatus.PENDING,
            paidAmountCents: 0,
        });

        await context.useCase.execute({ externalPaymentId: "mp-payment-1" });

        const persisted = await context.orderRepo.findById(order.id);
        expect(persisted?.status).toBe(OrderStatus.PENDING_PAYMENT);
    });
});
