import { ProductInput } from "../../app/products/dto/ProductInput";
import { ProductController } from "../controller/ProductController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { ProductValidator } from "../validators/ProductValidator";
import { UserAuthRouter } from "./UserAuthRouter";

type ProductInjection = { productInput: ProductInput };
type ProductUpdateInjection = { productUpdateInput: Partial<ProductInput> };

export class ProductRouter {
    constructor(
        private server: ServerPort,
        private productController: ProductController,
        private validator: ProductValidator,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "post",
            "/product/",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.validatorProductInput,
            this.createProduct
        );
        this.server.addRouter(
            "put",
            "/product/:id",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.validatorProductUpdateInput,
            this.updateProduct
        );
        this.server.addRouter(
            "delete",
            "/product/:id",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.deleteProduct
        );
        this.server.addRouter("get", "/product/:id", this.getById);
        this.server.addRouter("get", "/product/", this.getAll);
    }

    private deleteProduct: middleWare = async (req, res) => {
        try {
            const { id } = req.params;
            if (typeof id !== "string" || !id) {
                return res.status(400).json({ error: "Id do produto é obrigatório." });
            }
            await this.productController.delete(id);
            res.status(204).send();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private getById: middleWare = async (req, res) => {
        try {
            const { id } = req.params;
            if (typeof id !== "string" || !id) {
                return res.status(400).json({ error: "Id do produto é obrigatório." });
            }
            const product = await this.productController.getById(id);
            res.json(product);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private getAll: middleWare = async (req, res) => {
        try {
            const products = await this.productController.getAll();
            res.json(products);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private validatorProductInput: middleWare = async (req, res, next) => {
        try {
            const data = this.validator.validate(req.body);
            (req as IRequest<any, any, any, ProductInjection>).productInput = data;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private createProduct: middleWare = async (req, res) => {
        try {
            const input = (req as IRequest<any, any, any, ProductInjection>).productInput;
            const result = await this.productController.create(input);
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private validatorProductUpdateInput: middleWare = async (req, res, next) => {
        try {
            const data = this.validator.validateUpdate(req.body);
            (req as IRequest<any, any, any, ProductUpdateInjection>).productUpdateInput = data;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private updateProduct: middleWare = async (req, res) => {
        try {
            const { id } = req.params;
            const input = (req as IRequest<any, any, any, ProductUpdateInjection>).productUpdateInput;
            const result = await this.productController.update(id, input);
            res.status(200).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
