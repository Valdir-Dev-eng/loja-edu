import { beforeEach, describe, expect, it } from "vitest";
import { PurchaseShippingLabel } from "../../../src/app/shipping/useCase/PurchaseShippingLabel";
import { Address } from "../../../src/domain/entites/Address";
import { Order } from "../../../src/domain/entites/Order";
import { Product } from "../../../src/domain/entites/Product";
import { User } from "../../../src/domain/entites/User";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeShippingGatewayPort } from "../../doubles/FakeShippingGatewayPort";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const buildUseCase = () => {
    const orderRepo = new InMemoryRepository<Order>();
    const addressRepo = new InMemoryRepository<Address>();
    const userRepo = new InMemoryRepository<User>();
    const productRepo = new InMemoryRepository<Product>();
    const shippingGateway = new FakeShippingGatewayPort();
    const useCase = new PurchaseShippingLabel(orderRepo, addressRepo, userRepo, productRepo, shippingGateway);
    return { useCase, orderRepo, addressRepo, userRepo, productRepo, shippingGateway };
};

const buildScenario = async (context: ReturnType<typeof buildUseCase>, options: { withDocument?: boolean } = {}) => {
    const user = new User(
        createId(),
        "joao@gmail.com",
        "joao",
        "João da Silva",
        undefined,
        true,
        options.withDocument === false ? null : "12345678900"
    );
    await context.userRepo.save(user);
    const address = Address.build(
        createId,
        user.id,
        "João da Silva",
        "01310100",
        "Av Paulista",
        "1000",
        null,
        "Bela Vista",
        "São Paulo",
        "SP",
        "Casa"
    );
    await context.addressRepo.save(address);
    const product = Product.build(createId, "Dipirona", 1990, null, 10, 0.2, 5, 5, 10, null);
    await context.productRepo.save(product);
    const order = Order.build(
        createId,
        user.id,
        address.id,
        [{ productId: product.id, productName: product.name, priceCents: 1990, quantity: 1 }],
        1500,
        1
    );
    order.attachPayment("mp-payment-1");
    order.markAsPaid(order.totalCents);
    await context.orderRepo.save(order);
    return { user, address, product, order };
};

describe("PurchaseShippingLabel", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("insere no carrinho, compra e vincula o cartItemId ao pedido", async () => {
        const { order } = await buildScenario(context);
        context.shippingGateway.queueCartResult({ cartItemId: "cart-item-1", priceCents: 1500 });

        const output = await context.useCase.execute({ orderId: order.id });

        expect(output).toEqual({ orderId: order.id, cartItemId: "cart-item-1" });
        expect(context.shippingGateway.purchasedCartItemIds).toEqual(["cart-item-1"]);
        const persisted = await context.orderRepo.findById(order.id);
        expect(persisted?.shippingCartItemId).toBe("cart-item-1");
    });

    it("envia o documento do usuário e o peso/dimensão real do produto para o gateway", async () => {
        const { order } = await buildScenario(context);

        await context.useCase.execute({ orderId: order.id });

        expect(context.shippingGateway.lastCartInput?.destination.document).toBe("12345678900");
        expect(context.shippingGateway.lastCartInput?.volumes).toEqual([
            { weightKg: 0.2, widthCm: 5, heightCm: 5, lengthCm: 10 },
        ]);
    });

    it("recusa comprar frete de pedido inexistente", async () => {
        await expect(context.useCase.execute({ orderId: "id-inexistente" })).rejects.toThrow(NotFoundError);
        await expect(context.useCase.execute({ orderId: "id-inexistente" })).rejects.toThrow("Pedido não encontrado.");
    });

    it("recusa comprar frete de pedido que ainda não foi pago", async () => {
        const user = User.build(createId, "maria@gmail.com", "maria");
        await context.userRepo.save(user);
        const address = Address.build(createId, user.id, "Maria", "01310100", "Rua A", "1", null, "Centro", "SP", "SP", "Casa");
        await context.addressRepo.save(address);
        const order = Order.build(
            createId,
            user.id,
            address.id,
            [{ productId: "product-1", productName: "Dipirona", priceCents: 1990, quantity: 1 }],
            1500,
            1
        );
        await context.orderRepo.save(order);

        await expect(context.useCase.execute({ orderId: order.id })).rejects.toThrow(BusinessRuleError);
        await expect(context.useCase.execute({ orderId: order.id })).rejects.toThrow(
            "Só é possível comprar frete de um pedido pago."
        );
    });

    it("recusa comprar frete duas vezes para o mesmo pedido", async () => {
        const { order } = await buildScenario(context);
        await context.useCase.execute({ orderId: order.id });

        await expect(context.useCase.execute({ orderId: order.id })).rejects.toThrow(ConflictError);
        await expect(context.useCase.execute({ orderId: order.id })).rejects.toThrow(
            "Frete já foi comprado para este pedido."
        );
    });

    it("recusa comprar frete de usuário sem CPF/CNPJ cadastrado", async () => {
        const { order } = await buildScenario(context, { withDocument: false });

        await expect(context.useCase.execute({ orderId: order.id })).rejects.toThrow(BusinessRuleError);
        await expect(context.useCase.execute({ orderId: order.id })).rejects.toThrow(
            "Complete seu cadastro com CPF/CNPJ para comprar o frete."
        );
    });
});
