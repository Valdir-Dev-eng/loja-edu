import { ConfigApp } from "../config/ConfigApp";
import { Money } from "../../domain/money/Money";
import {
    CreatePixPaymentInput,
    CreatePixPaymentOutput,
    PaymentGatewayPort,
    PaymentStatusResult,
    WebhookSignatureInput,
} from "../../domain/payment/PaymentGatewayPort";
import { ConfigMercadoPago, IMercadoPagoSecrets } from "../config/ConfigMercadoPago";
import { createIdAdapter } from "../utils/createId";
import { MercadoPagoOrderStatusMapper } from "./MercadoPagoOrderStatusMapper";
import { WebhookSignatureValidator } from "./WebhookSignatureValidator";

const SANDBOX_APPROVAL_PAYER_FIRST_NAME = "APRO";
const SANDBOX_PAYER_EMAIL = "test_user_br@testuser.com";

interface MercadoPagoPaymentResponse {
    id: string;
    status: string;
    status_detail: string;
    external_reference: string;
    total_amount: string;
    total_paid_amount: string;
    transactions: {
        payments: Array<{
            id: string;
            date_of_expiration?: string;
            payment_method?: {
                qr_code?: string;
                qr_code_base64?: string;
            };
        }>;
    };
}

export class MercadoPagoAdapter extends PaymentGatewayPort {
    private readonly secrets: IMercadoPagoSecrets;

    constructor() {
        super();
        this.secrets = ConfigMercadoPago.getSecrets();
    }

    // Pix não tem sandbox no Mercado Pago via /v1/payments (API legada); a Orders API
    // (/v1/orders) simula aprovação em modo teste quando payer.first_name = "APRO" — por
    // isso o payload muda por ambiente, nunca em produção. O sandbox também recusa
    // qualquer e-mail que não termine em "@testuser.com" (código invalid_email_for_sandbox),
    // então o e-mail real do usuário também é substituído só em desenvolvimento.
    async createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentOutput> {
        const isDevelopment = ConfigApp.isDevelopment();
        const amount = Money.toDecimalString(input.totalCents);
        const response = await fetch(`${this.secrets.baseUrl}/v1/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.secrets.accessToken}`,
                "X-Idempotency-Key": createIdAdapter(),
            },
            body: JSON.stringify({
                type: "online",
                external_reference: input.orderId,
                total_amount: amount,
                payer: {
                    email: isDevelopment ? SANDBOX_PAYER_EMAIL : input.payerEmail,
                    first_name: isDevelopment ? SANDBOX_APPROVAL_PAYER_FIRST_NAME : input.payerFirstName,
                    last_name: input.payerLastName,
                },
                transactions: {
                    payments: [
                        {
                            amount,
                            payment_method: { id: "pix", type: "bank_transfer" },
                        },
                    ],
                },
            }),
        });
        if (!response.ok) {
            const responseBody = await response.text().catch(() => "");
            throw new Error(`Falha ao criar pagamento PIX no Mercado Pago (status ${response.status}): ${responseBody}`);
        }
        const order = (await response.json()) as MercadoPagoPaymentResponse;
        const payment = order.transactions.payments[0];
        return {
            externalPaymentId: String(order.id),
            qrCode: payment?.payment_method?.qr_code ?? "",
            qrCodeBase64: payment?.payment_method?.qr_code_base64 ?? "",
            expiresAt: payment?.date_of_expiration ? new Date(payment.date_of_expiration) : new Date(),
        };
    }

    async getPaymentStatus(externalPaymentId: string): Promise<PaymentStatusResult> {
        const response = await fetch(`${this.secrets.baseUrl}/v1/orders/${externalPaymentId}`, {
            headers: { Authorization: `Bearer ${this.secrets.accessToken}` },
        });
        if (!response.ok) {
            const responseBody = await response.text().catch(() => "");
            throw new Error(`Falha ao consultar pagamento no Mercado Pago (status ${response.status}): ${responseBody}`);
        }
        const order = (await response.json()) as MercadoPagoPaymentResponse;
        return {
            externalPaymentId: String(order.id),
            orderId: order.external_reference,
            status: MercadoPagoOrderStatusMapper.normalize(order.status, order.status_detail),
            paidAmountCents: Money.fromDecimalString(order.total_paid_amount),
        };
    }

    validateWebhookSignature(input: WebhookSignatureInput): boolean {
        return WebhookSignatureValidator.isValid({ ...input, secret: this.secrets.webhookSecret });
    }
}
