import { PaymentStatus } from "../../domain/payment/PaymentGatewayPort";

const STATUS_MAP: Record<string, PaymentStatus> = {
    "action_required:waiting_transfer": PaymentStatus.PENDING,
    "processed:accredited": PaymentStatus.APPROVED,
    "failed:failed": PaymentStatus.REJECTED,
    "canceled:canceled": PaymentStatus.CANCELLED,
    "expired:expired": PaymentStatus.CANCELLED,
    "refunded:refunded": PaymentStatus.REFUNDED,
    "processed:partially_refunded": PaymentStatus.REFUNDED,
    "charged_back:in_process": PaymentStatus.CHARGED_BACK,
    "charged_back:settled": PaymentStatus.CHARGED_BACK,
    "charged_back:reimbursed": PaymentStatus.CHARGED_BACK,
};

export class MercadoPagoOrderStatusMapper {
    static normalize(status: string, statusDetail: string): PaymentStatus {
        return STATUS_MAP[`${status}:${statusDetail}`] ?? PaymentStatus.PENDING;
    }
}
