export interface CalculateShippingOption {
    serviceId: number;
    carrierName: string;
    priceCents: number;
    priceDisplay: string;
    deliveryTimeDays: number;
}

export type CalculateShippingOutput = CalculateShippingOption[];
