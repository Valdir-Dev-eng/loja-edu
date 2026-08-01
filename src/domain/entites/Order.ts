import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

export const OrderStatus = {
    PENDING_PAYMENT: "PENDING_PAYMENT",
    PAID: "PAID",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    CHARGEBACK: "CHARGEBACK",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export interface OrderItem {
    productId: string;
    productName: string;
    priceCents: number;
    quantity: number;
}

export class Order {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly addressId: string,
        public readonly items: OrderItem[],
        public readonly totalCents: number,
        public readonly freightCents: number,
        public status: OrderStatus,
        public paymentId: string | null = null,
        public shippingServiceId: number | null = null,
        public shippingCartItemId: string | null = null,
        public readonly created_at: Date = new Date(),
        public updated_at: Date = new Date(),
        private _deleted_at: Date | null = null
    ) {}

    get deleted_at(): Date | null {
        return this._deleted_at;
    }

    static build(
        createId: CreateId,
        userId: string,
        addressId: string,
        items: OrderItem[],
        freightCents: number,
        shippingServiceId: number | null = null
    ): Order {
        if (items.length === 0) {
            throw new BusinessRuleError("O pedido precisa ter ao menos um item.");
        }
        if (!Number.isInteger(freightCents) || freightCents < 0) {
            throw new BusinessRuleError("Valor de frete inválido.");
        }
        const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
        return new Order(
            createId(),
            userId,
            addressId,
            items,
            totalCents,
            freightCents,
            OrderStatus.PENDING_PAYMENT,
            null,
            shippingServiceId
        );
    }

    attachPayment(paymentId: string): void {
        if (this.status !== OrderStatus.PENDING_PAYMENT) {
            throw new ConflictError("Só é possível vincular pagamento a um pedido aguardando pagamento.");
        }
        if (this.paymentId) {
            throw new ConflictError("Pedido já possui um pagamento vinculado.");
        }
        this.paymentId = paymentId;
        this.updated_at = new Date();
    }

    attachShipping(shippingServiceId: number, shippingCartItemId: string): void {
        if (this.shippingCartItemId) {
            throw new ConflictError("Frete já foi comprado para este pedido.");
        }
        this.shippingServiceId = shippingServiceId;
        this.shippingCartItemId = shippingCartItemId;
        this.updated_at = new Date();
    }

    markAsPaid(paidAmountCents: number): void {
        if (this.status !== OrderStatus.PENDING_PAYMENT) {
            throw new ConflictError("Só é possível confirmar pagamento de um pedido aguardando pagamento.");
        }
        if (paidAmountCents !== this.totalCents) {
            throw new BusinessRuleError("Valor pago não corresponde ao total do pedido.");
        }
        this.status = OrderStatus.PAID;
        this.updated_at = new Date();
    }

    markAsRejected(): void {
        this.transitionFromPending(OrderStatus.REJECTED, "recusado");
    }

    markAsExpired(): void {
        this.transitionFromPending(OrderStatus.EXPIRED, "expirado");
    }

    markAsCancelled(): void {
        this.transitionFromPending(OrderStatus.CANCELLED, "cancelado");
    }

    markAsRefunded(): void {
        this.transitionFromPaid(OrderStatus.REFUNDED, "estornado");
    }

    markAsChargedBack(): void {
        this.transitionFromPaid(OrderStatus.CHARGEBACK, "contestado (chargeback)");
    }

    softDelete(): void {
        if (this._deleted_at) {
            throw new ConflictError("Pedido já está deletado.");
        }
        this._deleted_at = new Date();
    }

    private transitionFromPending(next: OrderStatus, label: string): void {
        if (this.status !== OrderStatus.PENDING_PAYMENT) {
            throw new ConflictError(`Só é possível marcar como ${label} um pedido aguardando pagamento.`);
        }
        this.status = next;
        this.updated_at = new Date();
    }

    private transitionFromPaid(next: OrderStatus, label: string): void {
        if (this.status !== OrderStatus.PAID) {
            throw new ConflictError(`Só é possível marcar como ${label} um pedido já pago.`);
        }
        this.status = next;
        this.updated_at = new Date();
    }
}
