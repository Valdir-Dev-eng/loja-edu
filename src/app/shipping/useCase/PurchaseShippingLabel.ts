import { Address } from "../../../domain/entites/Address";
import { Order, OrderStatus } from "../../../domain/entites/Order";
import { Product } from "../../../domain/entites/Product";
import { User } from "../../../domain/entites/User";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { ConflictError } from "../../../domain/errors/ConflictError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ShippingCartVolume, ShippingGatewayPort } from "../../../domain/shipping/ShippingGatewayPort";
import { PurchaseShippingLabelInput } from "../dto/PurchaseShippingLabelInput";
import { PurchaseShippingLabelOutput } from "../dto/PurchaseShippingLabelOutput";

export class PurchaseShippingLabel {
    constructor(
        private orderRepo: RepositoryPort<Order>,
        private addressRepo: RepositoryPort<Address>,
        private userRepo: RepositoryPort<User>,
        private productRepo: RepositoryPort<Product>,
        private shippingGateway: ShippingGatewayPort
    ) {}

    async execute(input: PurchaseShippingLabelInput): Promise<PurchaseShippingLabelOutput> {
        const order = await this.orderRepo.findById(input.orderId);
        if (!order) {
            throw new NotFoundError("Pedido não encontrado.");
        }
        if (order.status !== OrderStatus.PAID) {
            throw new BusinessRuleError("Só é possível comprar frete de um pedido pago.");
        }
        if (order.shippingCartItemId) {
            throw new ConflictError("Frete já foi comprado para este pedido.");
        }
        if (order.shippingServiceId === null) {
            throw new BusinessRuleError("Pedido não tem opção de frete selecionada.");
        }

        const address = await this.addressRepo.findById(order.addressId);
        if (!address) {
            throw new NotFoundError("Endereço do pedido não encontrado.");
        }
        const user = await this.userRepo.findById(order.userId);
        if (!user) {
            throw new NotFoundError("Usuário do pedido não encontrado.");
        }
        if (!user.document) {
            throw new BusinessRuleError("Complete seu cadastro com CPF/CNPJ para comprar o frete.");
        }

        const volumes = await this.buildVolumes(order.items);

        const cartResult = await this.shippingGateway.insertInCart({
            serviceId: order.shippingServiceId,
            destination: {
                recipientName: address.recipientName,
                document: user.document,
                zipCode: address.zipCode,
                street: address.street,
                number: address.number,
                complement: address.complement,
                neighborhood: address.neighborhood,
                city: address.city,
                state: address.state,
            },
            products: order.items.map((item) => ({
                name: item.productName,
                quantity: item.quantity,
                unitaryValueCents: item.priceCents,
            })),
            volumes,
        });

        await this.shippingGateway.purchase(cartResult.cartItemId);

        order.attachShipping(order.shippingServiceId, cartResult.cartItemId);
        await this.orderRepo.update(order.id, order);

        return { orderId: order.id, cartItemId: cartResult.cartItemId };
    }

    private async buildVolumes(items: Order["items"]): Promise<ShippingCartVolume[]> {
        const volumes: ShippingCartVolume[] = [];
        for (const item of items) {
            const product = await this.productRepo.findById(item.productId);
            if (!product) {
                throw new NotFoundError(`Produto ${item.productId} do pedido não encontrado.`);
            }
            volumes.push({
                weightKg: product.weight,
                widthCm: product.width,
                heightCm: product.height,
                lengthCm: product.length,
            });
        }
        return volumes;
    }
}
