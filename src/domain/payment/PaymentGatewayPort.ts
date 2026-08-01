export interface CreatePixPaymentInput {
    orderId: string;
    totalCents: number;
    payerEmail: string;
    payerFirstName: string;
    payerLastName: string;
}

export interface CreatePixPaymentOutput {
    externalPaymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    expiresAt: Date;
}

export const PaymentStatus = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    CHARGED_BACK: "CHARGED_BACK",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface PaymentStatusResult {
    externalPaymentId: string;
    orderId: string;
    status: PaymentStatus;
    paidAmountCents: number;
}

export interface WebhookSignatureInput {
    xSignature: string | undefined;
    xRequestId: string | undefined;
    dataId: string | undefined;
}

export abstract class PaymentGatewayPort {
    abstract createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentOutput>;
    abstract getPaymentStatus(externalPaymentId: string): Promise<PaymentStatusResult>;
    abstract validateWebhookSignature(input: WebhookSignatureInput): boolean;
}
