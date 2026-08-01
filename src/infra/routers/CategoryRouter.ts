import { CategoryInput } from "../../app/categories/dto/CategoryInput";
import { CategoryController } from "../controller/CategoryController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { CategoryValidator } from "../validators/CategoryValidator";
import { UserAuthRouter } from "./UserAuthRouter";

type CategoryInjection = { categoryInput: CategoryInput };

export class CategoryRouter {
    constructor(
        private server: ServerPort,
        private controller: CategoryController,
        private validator: CategoryValidator,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "post",
            "/categories",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.validateCategoryInput,
            this.createCategory
        );
        this.server.addRouter("get", "/categories", this.listCategories);
    }

    private validateCategoryInput: middleWare = async (req, res, next) => {
        try {
            const data = this.validator.validate(req.body);
            (req as IRequest<any, any, any, CategoryInjection>).categoryInput = data;
            next();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private createCategory: middleWare = async (req, res) => {
        try {
            const input = (req as IRequest<any, any, any, CategoryInjection>).categoryInput;
            const result = await this.controller.create(input);
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private listCategories: middleWare = async (req, res) => {
        try {
            const result = await this.controller.list();
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
