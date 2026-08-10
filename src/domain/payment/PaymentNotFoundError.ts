export class PaymentNotFoundError extends Error {
    constructor(message = "Pagamento não encontrado no gateway.") {
        super(message);
        this.name = "PaymentNotFoundError";
    }
}
