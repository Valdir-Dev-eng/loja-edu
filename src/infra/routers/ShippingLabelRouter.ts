import { ShippingLabelController } from "../controller/ShippingLabelController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { middleWare, ServerPort } from "../server/ServerPort";
import { UserAuthRouter } from "./UserAuthRouter";

export class ShippingLabelRouter {
    constructor(
        private server: ServerPort,
        private controller: ShippingLabelController,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "post",
            "/admin/orders/:id/purchase-label",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.purchaseLabel
        );
        this.server.addRouter(
            "get",
            "/admin/orders/:id/label-print-link",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.getPrintLink
        );
    }

    private purchaseLabel: middleWare = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.controller.purchase(id);
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private getPrintLink: middleWare = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.controller.getPrintLink(id);
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
