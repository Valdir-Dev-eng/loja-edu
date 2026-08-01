export interface ShippingQuoteRequestItem {
    weightKg: number;
    widthCm: number;
    heightCm: number;
    lengthCm: number;
    insuranceValueCents: number;
    quantity: number;
}

export interface ShippingQuoteInput {
    destinationPostalCode: string;
    items: ShippingQuoteRequestItem[];
}

export interface ShippingQuoteOption {
    serviceId: number;
    carrierName: string;
    priceCents: number;
    deliveryTimeDays: number;
}

export interface ShippingDestination {
    recipientName: string;
    document: string;
    zipCode: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
}

export interface ShippingCartProduct {
    name: string;
    quantity: number;
    unitaryValueCents: number;
}

export interface ShippingCartVolume {
    weightKg: number;
    widthCm: number;
    heightCm: number;
    lengthCm: number;
}

export interface InsertShippingInCartInput {
    serviceId: number;
    destination: ShippingDestination;
    products: ShippingCartProduct[];
    volumes: ShippingCartVolume[];
}

export interface InsertShippingInCartOutput {
    cartItemId: string;
    priceCents: number;
}

export abstract class ShippingGatewayPort {
    abstract buildAuthorizationUrl(state: string, redirectUri: string): string;
    abstract completeConnection(code: string, redirectUri: string): Promise<void>;
    abstract isConnected(): Promise<boolean>;
    abstract quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]>;
    abstract insertInCart(input: InsertShippingInCartInput): Promise<InsertShippingInCartOutput>;
    abstract purchase(cartItemId: string): Promise<void>;
    abstract getPrintLink(cartItemId: string): Promise<string>;
}
