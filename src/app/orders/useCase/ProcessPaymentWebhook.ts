import { DataAccessPort } from "../../../domain/database/DataAcess";
import { Order, OrderStatus } from "../../../domain/entites/Order";
import { Product } from "../../../domain/entites/Product";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { ConflictError } from "../../../domain/errors/ConflictError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { PaymentGatewayPort, PaymentStatus } from "../../../domain/payment/PaymentGatewayPort";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ProcessPaymentWebhookInput } from "../dto/ProcessPaymentWebhookInput";

// TODO(race): GET /order/:id/payment-status (GetOrderPaymentStatus) chama
// este mesmo execute() pra reconciliar, e o frontend faz polling dessa rota
// enquanto o pedido esta PENDING_PAYMENT — ou seja, esse reconciliar roda em
// paralelo com a entrega real do webhook do Mercado Pago em TODA compra, nao
// so em caso de reentrega. A atomicidade abaixo (CAS via updateIfEqual,
// dentro de transacao) cobre isso corretamente: so uma chamada concorrente
// aplica os efeitos, as outras viram no-op silencioso. Registrar como
// proxima fatia (prioridade acima da fila) em PlantaArquitetural.md §13
// assim que o arquivo for localizado — nao encontrado no repo ainda.
export class ProcessPaymentWebhook {
    constructor(
        private orderRepo: RepositoryPort<Order>,
        private productRepo: RepositoryPort<Product>,
        private paymentGateway: PaymentGatewayPort,
        private dataAccess: DataAccessPort
    ) {}

    async execute(input: ProcessPaymentWebhookInput): Promise<void> {
        const result = await this.paymentGateway.getPaymentStatus(input.externalPaymentId);
        const order = await this.orderRepo.findById(result.orderId);
        if (!order) {
            throw new NotFoundError("Pedido não encontrado.");
        }

        switch (result.status) {
            case PaymentStatus.APPROVED:
                await this.handleApproved(order, result.paidAmountCents);
                return;
            case PaymentStatus.REJECTED:
                await this.handleReleaseStock(order, OrderStatus.REJECTED);
                return;
            case PaymentStatus.CANCELLED:
                await this.handleReleaseStock(order, OrderStatus.CANCELLED);
                return;
            case PaymentStatus.REFUNDED:
                await this.handleTerminalFromPaid(order, OrderStatus.REFUNDED);
                return;
            case PaymentStatus.CHARGED_BACK:
                await this.handleTerminalFromPaid(order, OrderStatus.CHARGEBACK);
                return;
            case PaymentStatus.PENDING:
                return;
        }
    }

    // CAS pelo estado de ORIGEM (WHERE status = PENDING_PAYMENT), nao pelo
    // estado alvo — assim uma chamada que perde a corrida ainda sabe
    // distinguir "outra chamada ja aplicou o mesmo alvo" (benigno) de
    // "pedido em estado que nunca deveria receber essa transicao" (erro
    // real), sem precisar de leitura-then-escrita: a decisao do que GRAVAR
    // nunca depende do resultado dessa leitura, so a mensagem de erro depende.
    private async handleApproved(order: Order, paidAmountCents: number): Promise<void> {
        if (paidAmountCents !== order.totalCents) {
            throw new BusinessRuleError("Valor pago não corresponde ao total do pedido.");
        }
        const won = await this.dataAccess.transaction(async (tx) => {
            const txOrderRepo = this.orderRepo.withTransaction(tx);
            return txOrderRepo.updateIfEqual(order.id, "status", OrderStatus.PENDING_PAYMENT, {
                status: OrderStatus.PAID,
            });
        });
        if (won) {
            return;
        }
        await this.assertBenignNoOp(order.id, OrderStatus.PAID, "confirmar pagamento de");
    }

    private async handleReleaseStock(order: Order, target: OrderStatus): Promise<void> {
        const won = await this.dataAccess.transaction(async (tx) => {
            const txOrderRepo = this.orderRepo.withTransaction(tx);
            const applied = await txOrderRepo.updateIfEqual(order.id, "status", OrderStatus.PENDING_PAYMENT, {
                status: target,
            });
            if (!applied) {
                return false;
            }
            const txProductRepo = this.productRepo.withTransaction(tx);
            await Promise.all(
                order.items.map((item) => txProductRepo.incrementField(item.productId, "stock", item.quantity))
            );
            return true;
        });
        if (won) {
            return;
        }
        const action = target === OrderStatus.REJECTED ? "recusar" : "cancelar";
        await this.assertBenignNoOp(order.id, target, action);
    }

    private async handleTerminalFromPaid(order: Order, target: OrderStatus): Promise<void> {
        const won = await this.dataAccess.transaction(async (tx) => {
            const txOrderRepo = this.orderRepo.withTransaction(tx);
            return txOrderRepo.updateIfEqual(order.id, "status", OrderStatus.PAID, { status: target });
        });
        if (won) {
            return;
        }
        const action = target === OrderStatus.REFUNDED ? "estornar" : "contestar (chargeback)";
        await this.assertBenignNoOp(order.id, target, action);
    }

    // So chamado depois que o CAS ja perdeu a corrida. Le de novo, FORA de
    // qualquer transacao, so pra classificar a resposta — nunca pra decidir
    // o que escrever (isso ja foi decidido, atomicamente, pelo UPDATE que
    // rodou antes). Se o estado atual bate com o alvo, outra chamada
    // concorrente ja aplicou a mesma transicao: no-op silencioso, idempotente.
    // Qualquer outro estado e' uma anomalia de verdade.
    private async assertBenignNoOp(orderId: string, target: OrderStatus, action: string): Promise<void> {
        const current = await this.orderRepo.findById(orderId);
        if (current?.status === target) {
            return;
        }
        throw new ConflictError(`Não é possível ${action} um pedido que não está mais aguardando pagamento.`);
    }
}
