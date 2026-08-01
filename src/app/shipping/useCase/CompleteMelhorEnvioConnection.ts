import { ShippingGatewayPort } from "../../../domain/shipping/ShippingGatewayPort";
import { CompleteMelhorEnvioConnectionInput } from "../dto/CompleteMelhorEnvioConnectionInput";

export class CompleteMelhorEnvioConnection {
    constructor(private shippingGateway: ShippingGatewayPort) {}

    async execute(input: CompleteMelhorEnvioConnectionInput): Promise<void> {
        await this.shippingGateway.completeConnection(input.code, input.redirectUri);
    }
}
