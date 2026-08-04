import { Address } from "../../../domain/entites/Address";
import { Order, OrderItem } from "../../../domain/entites/Order";
import { Product } from "../../../domain/entites/Product";
import { User } from "../../../domain/entites/User";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { CreateId } from "../../../domain/interface/CreateId";
import { Money } from "../../../domain/money/Money";
import { PaymentGatewayPort } from "../../../domain/payment/PaymentGatewayPort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ShippingGatewayPort, ShippingQuoteRequestItem } from "../../../domain/shipping/ShippingGatewayPort";
import { CheckoutOrderInput } from "../dto/CheckoutOrderInput";
import { CheckoutOrderOutput } from "../dto/CheckoutOrderOutput";

export class CheckoutOrder {
    constructor(
        private orderRepo: RepositoryPort<Order>,
        private productRepo: RepositoryPort<Product>,
        private addressRepo: RepositoryPort<Address>,
        private userRepo: RepositoryPort<User>,
        private paymentGateway: PaymentGatewayPort,
        private shippingGateway: ShippingGatewayPort,
        private createId: CreateId
    ) {}

    async execute(input: CheckoutOrderInput): Promise<CheckoutOrderOutput> {
        const user = await this.userRepo.findById(input.userId);
        if (!user) {
            throw new NotFoundError("Usuário não encontrado.");
        }
        const address = await this.addressRepo.findById(input.addressId);
        if (!address || address.userId !== user.id) {
            throw new NotFoundError("Endereço não encontrado.");
        }

        const productsById = await this.loadRequestedProducts(input.items);
        const { items, quoteItems } = this.buildItems(input.items, productsById);
        const freightCents = await this.resolveFreight(address.zipCode, quoteItems, input.shippingServiceId);

        const order = Order.build(this.createId, user.id, address.id, items, freightCents, input.shippingServiceId);
        const grandTotalCents = order.totalCents + order.freightCents;

        const payment = await this.paymentGateway.createPixPayment({
            orderId: order.id,
            totalCents: grandTotalCents,
            payerEmail: user.email,
            ...this.splitPayerName(user.fullName ?? user.username),
        });
        order.attachPayment(payment.externalPaymentId);
        await this.orderRepo.save(order);
        await this.decrementStock(items, productsById);

        return {
            orderId: order.id,
            status: order.status,
            totalCents: order.totalCents,
            totalDisplay: Money.toDisplay(order.totalCents),
            freightCents: order.freightCents,
            freightDisplay: Money.toDisplay(order.freightCents),
            grandTotalCents,
            grandTotalDisplay: Money.toDisplay(grandTotalCents),
            qrCode: payment.qrCode,
            qrCodeBase64: payment.qrCodeBase64,
            expiresAt: payment.expiresAt,
        };
    }

    private async loadRequestedProducts(requested: CheckoutOrderInput["items"]): Promise<Map<string, Product>> {
        const productIds = requested.map((requestedItem) => requestedItem.productId);
        const products = await this.productRepo.findManyByIds(productIds);
        return new Map(products.map((product) => [product.id, product]));
    }

    private buildItems(
        requested: CheckoutOrderInput["items"],
        productsById: Map<string, Product>
    ): { items: OrderItem[]; quoteItems: ShippingQuoteRequestItem[] } {
        const items: OrderItem[] = [];
        const quoteItems: ShippingQuoteRequestItem[] = [];
        for (const requestedItem of requested) {
            const product = productsById.get(requestedItem.productId);
            if (!product) {
                throw new NotFoundError(`Produto ${requestedItem.productId} não encontrado.`);
            }
            if (product.stock < requestedItem.quantity) {
                throw new BusinessRuleError(`Estoque insuficiente para o produto: ${product.name}`);
            }
            items.push({
                productId: product.id,
                productName: product.name,
                priceCents: product.priceCents,
                quantity: requestedItem.quantity,
            });
            quoteItems.push({
                weightKg: product.weight,
                widthCm: product.width,
                heightCm: product.height,
                lengthCm: product.length,
                insuranceValueCents: product.priceCents,
                quantity: requestedItem.quantity,
            });
        }
        return { items, quoteItems };
    }

    private async resolveFreight(
        destinationPostalCode: string,
        quoteItems: ShippingQuoteRequestItem[],
        shippingServiceId: number
    ): Promise<number> {
        const options = await this.shippingGateway.quote({ destinationPostalCode, items: quoteItems });
        const chosen = options.find((option) => option.serviceId === shippingServiceId);
        if (!chosen) {
            throw new BusinessRuleError("Opção de frete não está mais disponível. Cote novamente.");
        }
        return chosen.priceCents;
    }

    private async decrementStock(items: OrderItem[], productsById: Map<string, Product>): Promise<void> {
        // UPDATE ... WHERE stock >= quantidade, atomico no banco — nao le e
        // depois escreve o valor calculado, que perde decremento sob
        // concorrencia (ja provado por teste real de concorrencia).
        await Promise.all(
            items.map(async (item) => {
                const decremented = await this.productRepo.decrementFieldIfSufficient(item.productId, "stock", item.quantity);
                if (!decremented) {
                    const product = productsById.get(item.productId);
                    throw new BusinessRuleError(`Estoque insuficiente para o produto: ${product?.name ?? item.productName}`);
                }
            })
        );
    }

    private splitPayerName(fullName: string): { payerFirstName: string; payerLastName: string } {
        const [payerFirstName, ...rest] = fullName.trim().split(/\s+/);
        return { payerFirstName, payerLastName: rest.length > 0 ? rest.join(" ") : payerFirstName };
    }
}
