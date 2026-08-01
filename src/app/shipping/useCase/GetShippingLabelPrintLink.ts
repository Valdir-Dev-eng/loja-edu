import { Order } from "../../../domain/entites/Order";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ShippingGatewayPort } from "../../../domain/shipping/ShippingGatewayPort";
import { GetShippingLabelPrintLinkOutput } from "../dto/GetShippingLabelPrintLinkOutput";

export class GetShippingLabelPrintLink {
    constructor(private orderRepo: RepositoryPort<Order>, private shippingGateway: ShippingGatewayPort) {}

    async execute(orderId: string): Promise<GetShippingLabelPrintLinkOutput> {
        const order = await this.orderRepo.findById(orderId);
        if (!order) {
            throw new NotFoundError("Pedido não encontrado.");
        }
        if (!order.shippingCartItemId) {
            throw new BusinessRuleError("Pedido ainda não tem etiqueta de frete comprada.");
        }
        const url = await this.shippingGateway.getPrintLink(order.shippingCartItemId);
        return { url };
    }
}
