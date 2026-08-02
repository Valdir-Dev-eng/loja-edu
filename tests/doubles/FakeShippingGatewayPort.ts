import {
    InsertShippingInCartInput,
    InsertShippingInCartOutput,
    ShippingGatewayPort,
    ShippingQuoteInput,
    ShippingQuoteOption,
} from "../../src/domain/shipping/ShippingGatewayPort";

export class FakeShippingGatewayPort extends ShippingGatewayPort {
    public connected = true;
    public lastQuoteInput: ShippingQuoteInput | null = null;
    public quoteCallCount = 0;
    public lastCartInput: InsertShippingInCartInput | null = null;
    public purchasedCartItemIds: string[] = [];
    public printedCartItemIds: string[] = [];
    public lastCompletedCode: string | null = null;
    private nextQuoteOptions: ShippingQuoteOption[] = [];
    private nextCartResult: InsertShippingInCartOutput = { cartItemId: "cart-item-1", priceCents: 1000 };
    private nextPrintLink = "https://sandbox.melhorenvio.com.br/imprimir/fake";
    private shouldFailNextPurchase = false;

    queueQuoteOptions(options: ShippingQuoteOption[]): void {
        this.nextQuoteOptions = options;
    }

    queueCartResult(result: InsertShippingInCartOutput): void {
        this.nextCartResult = result;
    }

    queuePrintLink(url: string): void {
        this.nextPrintLink = url;
    }

    failNextPurchase(): void {
        this.shouldFailNextPurchase = true;
    }

    buildAuthorizationUrl(state: string, redirectUri: string): string {
        return `https://fake.melhorenvio.test/oauth/authorize?state=${state}&redirect_uri=${redirectUri}`;
    }

    async completeConnection(code: string): Promise<void> {
        this.lastCompletedCode = code;
        this.connected = true;
    }

    async isConnected(): Promise<boolean> {
        return this.connected;
    }

    async quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]> {
        this.lastQuoteInput = input;
        this.quoteCallCount += 1;
        return this.nextQuoteOptions;
    }

    async insertInCart(input: InsertShippingInCartInput): Promise<InsertShippingInCartOutput> {
        this.lastCartInput = input;
        return this.nextCartResult;
    }

    async purchase(cartItemId: string): Promise<void> {
        if (this.shouldFailNextPurchase) {
            this.shouldFailNextPurchase = false;
            throw new Error("Falha simulada ao comprar frete no Melhor Envio.");
        }
        this.purchasedCartItemIds.push(cartItemId);
    }

    async getPrintLink(cartItemId: string): Promise<string> {
        this.printedCartItemIds.push(cartItemId);
        return this.nextPrintLink;
    }
}
