import { AdminOrderTab } from "../../app/orders/dto/ListOrdersForAdminInput";
import { AdminController } from "../controller/AdminController";
import { OrderController } from "../controller/OrderController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { middleWare, ServerPort } from "../server/ServerPort";
import { UserAuthRouter } from "./UserAuthRouter";

export class AdminRouter {
    constructor(
        private server: ServerPort,
        private orderController: OrderController,
        private adminController: AdminController,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "get",
            "/admin/orders",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.listOrders
        );
        this.server.addRouter(
            "get",
            "/admin/users",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.listUsers
        );
    }

    private listOrders: middleWare = async (req, res) => {
        try {
            const tab = req.query.tab as AdminOrderTab;
            const result = await this.orderController.adminList(tab);
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private listUsers: middleWare = async (req, res) => {
        try {
            const result = await this.adminController.listUsers();
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
