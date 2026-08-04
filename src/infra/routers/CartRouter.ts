import { AddCartItemBody, CartValidator, UpdateCartItemBody } from "../validators/CartValidator";
import { CartController } from "../controller/CartController";
import { ConfigDomain } from "../config/ConfigDomain";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { SessionInjection, UserAuthRouter } from "./UserAuthRouter";

export const CART_TOKEN_COOKIE = "cartId";
const CART_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type AddCartItemInjection = { cartAddInput: AddCartItemBody };
type UpdateCartItemInjection = { cartUpdateInput: UpdateCartItemBody };
type CartInjection = { cartId: string | null };

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
        this.server.addRouter("get", "/cart", this.authRouter.optionalSession, this.resolveCart, this.list);
        this.server.addRouter(
            "post",
            "/cart/items",
            this.authRouter.optionalSession,
            this.resolveCart,
            this.validateAdd,
            this.add
        );
        this.server.addRouter(
            "put",
            "/cart/items/:productId",
            this.authRouter.optionalSession,
            this.resolveCart,
            this.validateUpdateQuantity,
            this.updateQuantity
        );
        this.server.addRouter(
            "delete",
            "/cart/items/:productId",
            this.authRouter.optionalSession,
            this.resolveCart,
            this.remove
        );
    }

    // Sempre le o id do carrinho do cookie da propria requisicao — nunca de
    // body/query, pra ninguem conseguir forjar "atua no carrinho X" so
    // mandando esse id num JSON. Cria carrinho novo (anonimo ou ja do
    // usuario, se logado) quando nao existe um valido ainda.
    private resolveCart: middleWare = async (req, res, next) => {
        try {
            const cartIdFromCookie = (req.cookies[CART_TOKEN_COOKIE] as string | undefined) ?? null;
            const { authenticatedUser } = req as IRequest<any, any, any, Partial<SessionInjection>>;
            const cart = await this.controller.resolve(cartIdFromCookie, authenticatedUser?.id ?? null, true);
            if (cart && cart.id !== cartIdFromCookie) {
                res.cookie(CART_TOKEN_COOKIE, cart.id, {
                    httpOnly: true,
                    secure: ConfigDomain.secure,
                    sameSite: "lax",
                    maxAge: CART_TOKEN_MAX_AGE_MS,
                });
            }
            (req as IRequest<any, any, any, CartInjection>).cartId = cart?.id ?? null;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

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

    private list: middleWare = async (req, res) => {
        try {
            const { cartId } = req as IRequest<any, any, any, CartInjection>;
            const result = cartId ? await this.controller.list(cartId) : [];
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private add: middleWare = async (req, res) => {
        try {
            const { cartId, cartAddInput } = req as IRequest<any, any, any, CartInjection & AddCartItemInjection>;
            const result = await this.controller.add(cartId as string, cartAddInput.productId, cartAddInput.quantity);
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private updateQuantity: middleWare = async (req, res) => {
        try {
            const { cartId, cartUpdateInput } = req as IRequest<any, any, any, CartInjection & UpdateCartItemInjection>;
            const result = await this.controller.updateQuantity(cartId as string, req.params.productId, cartUpdateInput.quantity);
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
            const { cartId } = req as IRequest<any, any, any, CartInjection>;
            await this.controller.remove(cartId as string, req.params.productId);
            res.status(204).send();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
