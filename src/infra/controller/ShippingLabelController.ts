import { PurchaseShippingLabel } from "../../app/shipping/useCase/PurchaseShippingLabel";
import { GetShippingLabelPrintLink } from "../../app/shipping/useCase/GetShippingLabelPrintLink";

export class ShippingLabelController {
    constructor(
        private purchaseShippingLabel: PurchaseShippingLabel,
        private getShippingLabelPrintLink: GetShippingLabelPrintLink
    ) {}

    async purchase(orderId: string) {
        return await this.purchaseShippingLabel.execute({ orderId });
    }

    async getPrintLink(orderId: string) {
        return await this.getShippingLabelPrintLink.execute(orderId);
    }
}
