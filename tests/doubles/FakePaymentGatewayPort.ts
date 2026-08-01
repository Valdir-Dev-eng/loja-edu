import {
    CreatePixPaymentInput,
    CreatePixPaymentOutput,
    PaymentGatewayPort,
    PaymentStatus,
    PaymentStatusResult,
    WebhookSignatureInput,
} from "../../src/domain/payment/PaymentGatewayPort";

export class FakePaymentGatewayPort extends PaymentGatewayPort {
    public createdPayments: CreatePixPaymentInput[] = [];
    public consultedPaymentIds: string[] = [];
    private shouldFailCreate = false;
    private shouldFailStatusCheck = false;
    private nextSignatureValid = true;
    private nextStatusResult: PaymentStatusResult | null = null;
    private sequence = 0;

    failNextCreate(): void {
        this.shouldFailCreate = true;
    }

    failNextStatusCheck(): void {
        this.shouldFailStatusCheck = true;
    }

    setNextSignatureValid(valid: boolean): void {
        this.nextSignatureValid = valid;
    }

    setNextStatusResult(result: PaymentStatusResult): void {
        this.nextStatusResult = result;
    }

    async createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentOutput> {
        this.createdPayments.push(input);
        if (this.shouldFailCreate) {
            throw new Error("Falha simulada ao criar pagamento PIX.");
        }
        this.sequence++;
        return {
            externalPaymentId: `fake-payment-${this.sequence}`,
            qrCode: "00020126-fake-copia-e-cola",
            qrCodeBase64: "ZmFrZS1xcg==",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };
    }

    async getPaymentStatus(externalPaymentId: string): Promise<PaymentStatusResult> {
        this.consultedPaymentIds.push(externalPaymentId);
        if (this.shouldFailStatusCheck) {
            throw new Error("Falha simulada ao consultar pagamento.");
        }
        if (this.nextStatusResult) {
            return this.nextStatusResult;
        }
        return {
            externalPaymentId,
            orderId: "order-id-1",
            status: PaymentStatus.APPROVED,
            paidAmountCents: 0,
        };
    }

    validateWebhookSignature(_input: WebhookSignatureInput): boolean {
        return this.nextSignatureValid;
    }
}
