import { describe, expect, it } from "vitest";
import { OrderRepository } from "../../src/infra/repository/OrderRepository";
import { Order } from "../../src/domain/entites/Order";
import { TestWithMemoryDataAcess } from "../doubles/TestWithMemoryDataAcess";

let sequence = 0;
const createId = () => `order-concurrency-${++sequence}`;

const buildOrder = (index: number): Order =>
    Order.build(
        createId,
        `user-${index}`,
        `address-${index}`,
        [
            {
                productId: `product-${index}`,
                productName: `Produto ${index}`,
                priceCents: 1000 * (index + 1),
                quantity: index + 1,
            },
        ],
        500
    );

describe("OrderRepository — prova de concorrência real (criação e hydrate em lote)", () => {
    it("cria pedidos concorrentes sem misturar itens entre eles no hydrate em lote", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new OrderRepository(db);
        const orders = Array.from({ length: 8 }, (_, index) => buildOrder(index));

        await Promise.all(orders.map((order) => repo.save(order)));
        const persisted = await repo.findAll();

        expect(persisted).toHaveLength(8);
        for (const order of orders) {
            const found = persisted.find((candidate) => candidate.id === order.id);
            expect(found).toBeDefined();
            expect(found!.items).toHaveLength(1);
            expect(found!.items[0].productId).toBe(order.items[0].productId);
            expect(found!.items[0].quantity).toBe(order.items[0].quantity);
        }
    });

    it("findManyByIds em lote devolve os itens certos pra um subconjunto de pedidos criados concorrentemente", async () => {
        const db = new TestWithMemoryDataAcess(3);
        const repo = new OrderRepository(db);
        const orders = Array.from({ length: 6 }, (_, index) => buildOrder(index));
        await Promise.all(orders.map((order) => repo.save(order)));

        const subsetIds = [orders[1].id, orders[4].id];
        const subset = await repo.findManyByIds(subsetIds);

        expect(subset).toHaveLength(2);
        const byId = new Map(subset.map((order) => [order.id, order]));
        expect(byId.get(orders[1].id)!.items[0].productId).toBe(orders[1].items[0].productId);
        expect(byId.get(orders[4].id)!.items[0].productId).toBe(orders[4].items[0].productId);
    });
});
