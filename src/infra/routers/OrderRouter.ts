import { OrderController } from "../controller/OrderController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { CheckoutOrderData, OrderValidator } from "../validators/OrderValidator";
import { SessionInjection, UserAuthRouter } from "./UserAuthRouter";

type CheckoutInjection = { checkoutInput: CheckoutOrderData };

export class OrderRouter {
    constructor(
        private server: ServerPort,
        private controller: OrderController,
        private validator: OrderValidator,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "post",
            "/order/checkout",
            this.authRouter.requireSession,
            this.authRouter.requireCompletedOnboarding,
            this.validateCheckoutInput,
            this.checkout
        );
        this.server.addRouter("get", "/order/my", this.authRouter.requireSession, this.myOrders);
        this.server.addRouter(
            "get",
            "/order/:id/payment-status",
            this.authRouter.requireSession,
            this.paymentStatus
        );
    }

    private validateCheckoutInput: middleWare = async (req, res, next) => {
        try {
            const data = this.validator.validateCheckout(req.body);
            (req as IRequest<any, any, any, CheckoutInjection>).checkoutInput = data;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private checkout: middleWare = async (req, res) => {
        try {
            const { authenticatedUser, checkoutInput } = req as IRequest<
                any,
                any,
                any,
                SessionInjection & CheckoutInjection
            >;
            const result = await this.controller.checkout({
                userId: authenticatedUser.id,
                addressId: checkoutInput.addressId,
                shippingServiceId: checkoutInput.shippingServiceId,
                items: checkoutInput.items,
            });
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private myOrders: middleWare = async (req, res) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            const result = await this.controller.myOrders(authenticatedUser.id);
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private paymentStatus: middleWare = async (req, res) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            const { id } = req.params;
            const result = await this.controller.paymentStatus(id, authenticatedUser.id);
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
