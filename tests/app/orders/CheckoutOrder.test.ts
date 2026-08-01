import { beforeEach, describe, expect, it } from "vitest";
import { CheckoutOrder } from "../../../src/app/orders/useCase/CheckoutOrder";
import { Address } from "../../../src/domain/entites/Address";
import { Order, OrderStatus } from "../../../src/domain/entites/Order";
import { Product } from "../../../src/domain/entites/Product";
import { User } from "../../../src/domain/entites/User";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakePaymentGatewayPort } from "../../doubles/FakePaymentGatewayPort";
import { FakeShippingGatewayPort } from "../../doubles/FakeShippingGatewayPort";

let sequence = 0;
const createId = () => `generated-id-${++sequence}`;

const DEFAULT_SHIPPING_SERVICE_ID = 1;

const buildUseCase = () => {
    const orderRepo = new InMemoryRepository<Order>();
    const productRepo = new InMemoryRepository<Product>();
    const addressRepo = new InMemoryRepository<Address>();
    const userRepo = new InMemoryRepository<User>();
    const paymentGateway = new FakePaymentGatewayPort();
    const shippingGateway = new FakeShippingGatewayPort();
    shippingGateway.queueQuoteOptions([
        { serviceId: DEFAULT_SHIPPING_SERVICE_ID, carrierName: "PAC", priceCents: 1500, deliveryTimeDays: 7 },
    ]);
    const useCase = new CheckoutOrder(orderRepo, productRepo, addressRepo, userRepo, paymentGateway, shippingGateway, createId);
    return { useCase, orderRepo, productRepo, addressRepo, userRepo, paymentGateway, shippingGateway };
};

const buildUser = async (context: ReturnType<typeof buildUseCase>) => {
    const user = User.build(createId, "joao@gmail.com", "joao");
    user.completeOnboarding("João da Silva", 1, "52998224725");
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
    return { user, address };
};

const buildProduct = async (
    context: ReturnType<typeof buildUseCase>,
    name: string,
    priceCents: number,
    stock: number
) => {
    const product = Product.build(createId, name, priceCents, null, stock, 0.1, 5, 5, 10, null);
    await context.productRepo.save(product);
    return product;
};

const buildCheckoutInput = (
    userId: string,
    addressId: string,
    items: { productId: string; quantity: number }[],
    shippingServiceId = DEFAULT_SHIPPING_SERVICE_ID
) => ({ userId, addressId, shippingServiceId, items });

describe("CheckoutOrder", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cobra o frete cotado no servidor junto com o total dos itens", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);

        const output = await context.useCase.execute(
            buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 1 }])
        );

        expect(output.totalCents).toBe(1990);
        expect(output.freightCents).toBe(1500);
        expect(output.grandTotalCents).toBe(3490);
        expect(output.grandTotalDisplay).toBe("R$ 34,90");
        expect(context.paymentGateway.createdPayments[0].totalCents).toBe(3490);
    });

    it("salva o pedido com o frete e a opção de serviço escolhidos", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);

        const output = await context.useCase.execute(
            buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 1 }])
        );

        const savedOrder = await context.orderRepo.findById(output.orderId);
        expect(savedOrder?.freightCents).toBe(1500);
        expect(savedOrder?.shippingServiceId).toBe(DEFAULT_SHIPPING_SERVICE_ID);
    });

    it("cria o pedido e devolve o QR do PIX", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);

        const output = await context.useCase.execute(
            buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 2 }])
        );

        expect(output.totalCents).toBe(3980);
        expect(output.status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(output.qrCode).toBeTruthy();
        expect(output.qrCodeBase64).toBeTruthy();
    });

    it("soma o total de múltiplos produtos em centavos", async () => {
        const { user, address } = await buildUser(context);
        const first = await buildProduct(context, "Dipirona", 1990, 10);
        const second = await buildProduct(context, "Paracetamol", 1250, 10);

        const output = await context.useCase.execute(
            buildCheckoutInput(user.id, address.id, [
                { productId: first.id, quantity: 2 },
                { productId: second.id, quantity: 3 },
            ])
        );

        expect(output.totalCents).toBe(1990 * 2 + 1250 * 3);
    });

    it("decrementa o estoque dos produtos comprados", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);

        await context.useCase.execute(buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 3 }]));

        const persistedProduct = await context.productRepo.findById(product.id);
        expect(persistedProduct?.stock).toBe(7);
    });

    it("salva o pedido com o id de pagamento vinculado", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);

        const output = await context.useCase.execute(
            buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 1 }])
        );

        const savedOrder = await context.orderRepo.findById(output.orderId);
        expect(savedOrder?.paymentId).toBeTruthy();
    });

    it("cota o frete usando o CEP do endereço escolhido e o peso/dimensão real do produto", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);

        await context.useCase.execute(buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 2 }]));

        expect(context.shippingGateway.lastQuoteInput?.destinationPostalCode).toBe("01310100");
        expect(context.shippingGateway.lastQuoteInput?.items).toEqual([
            { weightKg: 0.1, widthCm: 5, heightCm: 5, lengthCm: 10, insuranceValueCents: 1990, quantity: 2 },
        ]);
    });

    it("recusa checkout para usuário inexistente", async () => {
        await expect(
            context.useCase.execute(buildCheckoutInput("id-inexistente", "endereco-qualquer", []))
        ).rejects.toThrow(NotFoundError);
        await expect(
            context.useCase.execute(buildCheckoutInput("id-inexistente", "endereco-qualquer", []))
        ).rejects.toThrow("Usuário não encontrado.");
    });

    it("recusa checkout para endereço inexistente", async () => {
        const { user } = await buildUser(context);

        await expect(context.useCase.execute(buildCheckoutInput(user.id, "endereco-inexistente", []))).rejects.toThrow(
            NotFoundError
        );
        await expect(context.useCase.execute(buildCheckoutInput(user.id, "endereco-inexistente", []))).rejects.toThrow(
            "Endereço não encontrado."
        );
    });

    it("recusa checkout com endereço de outro usuário (nunca revela que existe)", async () => {
        const { address } = await buildUser(context);
        const otherUser = User.build(createId, "maria@gmail.com", "maria");
        otherUser.completeOnboarding("Maria", 1, "52998224725");
        await context.userRepo.save(otherUser);

        await expect(context.useCase.execute(buildCheckoutInput(otherUser.id, address.id, []))).rejects.toThrow(
            NotFoundError
        );
    });

    it("recusa checkout com produto inexistente", async () => {
        const { user, address } = await buildUser(context);

        await expect(
            context.useCase.execute(buildCheckoutInput(user.id, address.id, [{ productId: "produto-inexistente", quantity: 1 }]))
        ).rejects.toThrow(NotFoundError);
    });

    it("recusa checkout com estoque insuficiente", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 1);

        await expect(
            context.useCase.execute(buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 5 }]))
        ).rejects.toThrow(BusinessRuleError);
        await expect(
            context.useCase.execute(buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 5 }]))
        ).rejects.toThrow("Estoque insuficiente para o produto: Dipirona");
    });

    it("recusa checkout quando a opção de frete escolhida não vem mais na cotação (nunca confia no preço enviado pelo cliente)", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);
        context.shippingGateway.queueQuoteOptions([
            { serviceId: 999, carrierName: "SEDEX", priceCents: 3000, deliveryTimeDays: 2 },
        ]);

        await expect(
            context.useCase.execute(buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 1 }]))
        ).rejects.toThrow(BusinessRuleError);
        await expect(
            context.useCase.execute(buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 1 }]))
        ).rejects.toThrow("Opção de frete não está mais disponível. Cote novamente.");
    });

    it("ignora qualquer freight/preço injetado no input, mesmo contornando o TypeScript, e usa só o preço que o gateway acabou de cotar", async () => {
        const { user, address } = await buildUser(context);
        const product = await buildProduct(context, "Dipirona", 1990, 10);
        const tamperedInput = {
            ...buildCheckoutInput(user.id, address.id, [{ productId: product.id, quantity: 1 }]),
            freightCents: 1,
            freight: 1,
            totalCents: 1,
            grandTotalCents: 1,
        } as unknown as Parameters<typeof context.useCase.execute>[0];

        const output = await context.useCase.execute(tamperedInput);

        expect(output.freightCents).toBe(1500);
        expect(output.grandTotalCents).toBe(1990 + 1500);
        const savedOrder = await context.orderRepo.findById(output.orderId);
        expect(savedOrder?.freightCents).toBe(1500);
    });
});
