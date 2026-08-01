import { describe, expect, it } from "vitest";
import { MercadoPagoOrderStatusMapper } from "../../../src/infra/payment/MercadoPagoOrderStatusMapper";
import { PaymentStatus } from "../../../src/domain/payment/PaymentGatewayPort";

describe("MercadoPagoOrderStatusMapper", () => {
    it("normaliza action_required/waiting_transfer (Pix aguardando pagamento) para PENDING", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("action_required", "waiting_transfer")).toBe(
            PaymentStatus.PENDING
        );
    });

    it("normaliza processed/accredited para APPROVED", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("processed", "accredited")).toBe(PaymentStatus.APPROVED);
    });

    it("normaliza failed/failed para REJECTED", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("failed", "failed")).toBe(PaymentStatus.REJECTED);
    });

    it("normaliza canceled/canceled para CANCELLED", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("canceled", "canceled")).toBe(PaymentStatus.CANCELLED);
    });

    it("normaliza expired/expired para CANCELLED (domínio ainda não distingue expirado de cancelado)", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("expired", "expired")).toBe(PaymentStatus.CANCELLED);
    });

    it("normaliza refunded/refunded para REFUNDED", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("refunded", "refunded")).toBe(PaymentStatus.REFUNDED);
    });

    it("normaliza processed/partially_refunded para REFUNDED", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("processed", "partially_refunded")).toBe(
            PaymentStatus.REFUNDED
        );
    });

    it.each(["in_process", "settled", "reimbursed"])(
        "normaliza charged_back/%s para CHARGED_BACK",
        (statusDetail) => {
            expect(MercadoPagoOrderStatusMapper.normalize("charged_back", statusDetail)).toBe(
                PaymentStatus.CHARGED_BACK
            );
        }
    );

    it("recai em PENDING para qualquer combinação status/status_detail desconhecida", () => {
        expect(MercadoPagoOrderStatusMapper.normalize("processing", "in_process")).toBe(PaymentStatus.PENDING);
        expect(MercadoPagoOrderStatusMapper.normalize("created", "created")).toBe(PaymentStatus.PENDING);
        expect(MercadoPagoOrderStatusMapper.normalize("algo_novo_do_mp", "detalhe_desconhecido")).toBe(
            PaymentStatus.PENDING
        );
    });
});
