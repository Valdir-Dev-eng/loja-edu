import { describe, expect, it } from "vitest";
import { ProcessPaymentWebhook } from "../../src/app/orders/useCase/ProcessPaymentWebhook";
import { Order, OrderStatus } from "../../src/domain/entites/Order";
import { Product } from "../../src/domain/entites/Product";
import { PaymentStatus } from "../../src/domain/payment/PaymentGatewayPort";
import { OrderRepository } from "../../src/infra/repository/OrderRepository";
import { ProductRepository } from "../../src/infra/repository/ProductRepository";
import { TestWithMemoryDataAcess } from "../doubles/TestWithMemoryDataAcess";
import { FakePaymentGatewayPort } from "../doubles/FakePaymentGatewayPort";
import { FakeWebSocketNotifierPort } from "../doubles/FakeWebSocketNotifierPort";

let sequence = 0;
const createId = () => `webhook-concurrency-${++sequence}`;

// Simula exatamente o cenario real que motivou esta fatia: o polling de
// GET /order/:id/payment-status e a entrega do webhook do Mercado Pago
// chamando ProcessPaymentWebhook.execute() pro MESMO pedido, ao mesmo tempo.
// TestWithMemoryDataAcess injeta atraso aleatorio em toda operacao (mesmo
// double do teste de concorrencia do decrementFieldIfSufficient), entao as
// 10 chamadas concorrentes realmente disputam a corrida, nao rodam em serie
// disfarcada de paralelo.
describe("ProcessPaymentWebhook — atomicidade sob concorrência real (webhook + polling simultâneos)", () => {
    it("aplica a rejeição e devolve o estoque exatamente uma vez, mesmo com 10 chamadas concorrentes pro mesmo pedido", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const orderRepo = new OrderRepository(db);
        const productRepo = new ProductRepository(db);
        const paymentGateway = new FakePaymentGatewayPort();
        const wsNotifier = new FakeWebSocketNotifierPort();
        const useCase = new ProcessPaymentWebhook(orderRepo, productRepo, paymentGateway, db, wsNotifier);

        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await productRepo.save(product);
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: product.id, productName: product.name, priceCents: 1990, quantity: 3 }],
            500
        );
        order.attachPayment("mp-payment-concurrency");
        await orderRepo.save(order);

        paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-concurrency",
            orderId: order.id,
            status: PaymentStatus.REJECTED,
            paidAmountCents: 0,
        });

        const concurrentCalls = 10;
        const results = await Promise.allSettled(
            Array.from({ length: concurrentCalls }, () => useCase.execute({ externalPaymentId: "mp-payment-concurrency" }))
        );

        // Nenhuma chamada deveria rejeitar: a que perde a corrida cai no
        // no-op benigno (mesmo alvo já aplicado), não em erro.
        const rejected = results.filter((result) => result.status === "rejected");
        expect(rejected).toEqual([]);

        const finalOrder = await orderRepo.findById(order.id);
        const finalProduct = await productRepo.findById(product.id);
        expect(finalOrder!.status).toBe(OrderStatus.REJECTED);
        expect(finalProduct!.stock).toBe(10 + 3); // devolvido uma vez só, não 10x nem 0x
    });

    it("marca como pago exatamente uma vez, mesmo com 10 chamadas concorrentes pro mesmo pedido", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const orderRepo = new OrderRepository(db);
        const productRepo = new ProductRepository(db);
        const paymentGateway = new FakePaymentGatewayPort();
        const wsNotifier = new FakeWebSocketNotifierPort();
        const useCase = new ProcessPaymentWebhook(orderRepo, productRepo, paymentGateway, db, wsNotifier);

        const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.1, 5, 5, 10, null);
        await productRepo.save(product);
        const order = Order.build(
            createId,
            "user-1",
            "address-1",
            [{ productId: product.id, productName: product.name, priceCents: 1990, quantity: 2 }],
            500
        );
        order.attachPayment("mp-payment-concurrency-paid");
        await orderRepo.save(order);

        paymentGateway.setNextStatusResult({
            externalPaymentId: "mp-payment-concurrency-paid",
            orderId: order.id,
            status: PaymentStatus.APPROVED,
            paidAmountCents: order.totalCents,
        });

        const concurrentCalls = 10;
        const results = await Promise.allSettled(
            Array.from({ length: concurrentCalls }, () =>
                useCase.execute({ externalPaymentId: "mp-payment-concurrency-paid" })
            )
        );

        const rejected = results.filter((result) => result.status === "rejected");
        expect(rejected).toEqual([]);

        const finalOrder = await orderRepo.findById(order.id);
        expect(finalOrder!.status).toBe(OrderStatus.PAID);
    });
});
