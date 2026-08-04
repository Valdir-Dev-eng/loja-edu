import { AddCartItemBody, CartValidator, MergeCartBody, UpdateCartItemBody } from "../validators/CartValidator";
import { CartController } from "../controller/CartController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { SessionInjection, UserAuthRouter } from "./UserAuthRouter";

type AddCartItemInjection = { cartAddInput: AddCartItemBody };
type UpdateCartItemInjection = { cartUpdateInput: UpdateCartItemBody };
type MergeCartInjection = { cartMergeInput: MergeCartBody };

export class CartRouter {
    constructor(
        private server: ServerPort,
        private controller: CartController,
        private validator: CartValidator,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter("get", "/cart/my", this.authRouter.requireSession, this.list);
        this.server.addRouter(
            "post",
            "/cart/items",
            this.authRouter.requireSession,
            this.validateAdd,
            this.add
        );
        this.server.addRouter(
            "put",
            "/cart/items/:productId",
            this.authRouter.requireSession,
            this.validateUpdateQuantity,
            this.updateQuantity
        );
        this.server.addRouter("delete", "/cart/items/:productId", this.authRouter.requireSession, this.remove);
        this.server.addRouter(
            "post",
            "/cart/merge",
            this.authRouter.requireSession,
            this.validateMerge,
            this.merge
        );
    }

    private validateAdd: middleWare = async (req, res, next) => {
        try {
            const cartAddInput = this.validator.validateAdd(req.body);
            (req as IRequest<any, any, any, AddCartItemInjection>).cartAddInput = cartAddInput;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private validateUpdateQuantity: middleWare = async (req, res, next) => {
        try {
            const cartUpdateInput = this.validator.validateUpdateQuantity(req.body);
            (req as IRequest<any, any, any, UpdateCartItemInjection>).cartUpdateInput = cartUpdateInput;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private validateMerge: middleWare = async (req, res, next) => {
        try {
            const cartMergeInput = this.validator.validateMerge(req.body);
            (req as IRequest<any, any, any, MergeCartInjection>).cartMergeInput = cartMergeInput;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private list: middleWare = async (req, res) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            const result = await this.controller.list(authenticatedUser.id);
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private add: middleWare = async (req, res) => {
        try {
            const { authenticatedUser, cartAddInput } = req as IRequest<any, any, any, SessionInjection & AddCartItemInjection>;
            const result = await this.controller.add(authenticatedUser.id, cartAddInput.productId, cartAddInput.quantity);
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private updateQuantity: middleWare = async (req, res) => {
        try {
            const { authenticatedUser, cartUpdateInput } = req as IRequest<
                any,
                any,
                any,
                SessionInjection & UpdateCartItemInjection
            >;
            const { productId } = req.params;
            const result = await this.controller.updateQuantity(authenticatedUser.id, productId, cartUpdateInput.quantity);
            if (!result) {
                return res.status(204).send();
            }
            res.status(200).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private remove: middleWare = async (req, res) => {
        try {
            const { authenticatedUser } = req as IRequest<any, any, any, SessionInjection>;
            const { productId } = req.params;
            await this.controller.remove(authenticatedUser.id, productId);
            res.status(204).send();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private merge: middleWare = async (req, res) => {
        try {
            const { authenticatedUser, cartMergeInput } = req as IRequest<any, any, any, SessionInjection & MergeCartInjection>;
            const result = await this.controller.merge(authenticatedUser.id, cartMergeInput.items);
            res.status(200).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
