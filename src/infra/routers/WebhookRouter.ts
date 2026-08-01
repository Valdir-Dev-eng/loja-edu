import { UnauthorizedError } from "../../domain/errors/UnauthorizedError";
import { PaymentGatewayPort } from "../../domain/payment/PaymentGatewayPort";
import { OrderController } from "../controller/OrderController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { middleWare, ServerPort } from "../server/ServerPort";

export class WebhookRouter {
    constructor(
        private server: ServerPort,
        private controller: OrderController,
        private paymentGateway: PaymentGatewayPort
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter("post", "/webhooks/mercadopago", this.receive);
    }

    private receive: middleWare = async (req, res) => {
        try {
            const dataId = req.query["data.id"] as string | undefined;
            const isValid = this.paymentGateway.validateWebhookSignature({
                xSignature: req.headers["x-signature"] as string | undefined,
                xRequestId: req.headers["x-request-id"] as string | undefined,
                dataId,
            });
            if (!isValid || !dataId) {
                throw new UnauthorizedError("Assinatura do webhook inválida.");
            }
            await this.controller.processWebhook(dataId);
            res.status(200).send("ok");
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
