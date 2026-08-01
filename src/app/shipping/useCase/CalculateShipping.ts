import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { Money } from "../../../domain/money/Money";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ShippingGatewayPort, ShippingQuoteRequestItem } from "../../../domain/shipping/ShippingGatewayPort";
import { CalculateShippingInput } from "../dto/CalculateShippingInput";
import { CalculateShippingOutput } from "../dto/CalculateShippingOutput";

export class CalculateShipping {
    constructor(private productRepo: RepositoryPort<Product>, private shippingGateway: ShippingGatewayPort) {}

    async execute(input: CalculateShippingInput): Promise<CalculateShippingOutput> {
        const items = await this.buildQuoteItems(input.items);
        const options = await this.shippingGateway.quote({
            destinationPostalCode: input.destinationPostalCode,
            items,
        });

        return options.map((option) => ({
            serviceId: option.serviceId,
            carrierName: option.carrierName,
            priceCents: option.priceCents,
            priceDisplay: Money.toDisplay(option.priceCents),
            deliveryTimeDays: option.deliveryTimeDays,
        }));
    }

    private async buildQuoteItems(requested: CalculateShippingInput["items"]): Promise<ShippingQuoteRequestItem[]> {
        const items: ShippingQuoteRequestItem[] = [];
        for (const requestedItem of requested) {
            const product = await this.productRepo.findById(requestedItem.productId);
            if (!product) {
                throw new NotFoundError(`Produto ${requestedItem.productId} não encontrado.`);
            }
            items.push({
                weightKg: product.weight,
                widthCm: product.width,
                heightCm: product.height,
                lengthCm: product.length,
                insuranceValueCents: product.priceCents,
                quantity: requestedItem.quantity,
            });
        }
        return items;
    }
}
