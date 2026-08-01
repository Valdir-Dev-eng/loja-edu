import { CalculateShippingInput } from "../../app/shipping/dto/CalculateShippingInput";
import { CalculateShipping } from "../../app/shipping/useCase/CalculateShipping";

export class ShippingController {
    constructor(private calculateShipping: CalculateShipping) {}

    async quote(input: CalculateShippingInput) {
        return await this.calculateShipping.execute(input);
    }
}
