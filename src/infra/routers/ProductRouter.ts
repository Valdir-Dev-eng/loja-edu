import { ProductController } from "../controller/ProductController";
import { ProductInput } from "../schema/ProductSchema";
import { IRequest, middleWare, ServerPort } from "../server/ServerPort";
import { Validator } from "../validators/Validator";
import { methodHttp } from "../server/ServerPort";

type ProductInjection = { productInput: ProductInput };

export class ProductRouter {
    constructor(
        private server: ServerPort,
        private productController: ProductController,
        private validator: Validator<ProductInput>
    ) {
        this.boot();
    }

private boot() {
    this.registerRouterProductInput("post", "/user/", this.createProduct.bind(this));
    this.server.addRouter("put", "/user/:id", this.updateProduct.bind(this));
    this.server.addRouter("delete", "/user/:id", this.deleteProduct.bind(this));
    this.server.addRouter("get", "/user/:id", this.getById.bind(this));
    this.server.addRouter("get", "/user/", this.getAll.bind(this));
}

private deleteProduct: middleWare = async (req, res) => {
    const { id } = req.params;
    if(typeof id != "string" || id == "undefined" || !id)
        return res.status(400).json({message:"Error bad request, I need id"})
    console.log("DEBUG ID RECEBIDO:", id);
    await this.productController.delete(id);
    res.status(204).send();
}

private getById: middleWare = async (req, res) => {
    const id = req.params.id
    console.log(typeof id);
    
    if(typeof id != "string" || id == "undefined" || !id)
        return res.status(400).json({message:"Error bad request, I need id"})
    const product = await this.productController.getById(req.params.id);
    product ? res.json(product) : res.status(404).json({ message: "Not found" });
}

private getAll: middleWare = async (req, res) => {
    const products = await this.productController.getAll();
    res.json(products);
}

    private registerRouterProductInput(methodHttp:methodHttp, path:string, ...callback:middleWare[]){
        this.server.addRouter(methodHttp,path,this.validatorProductInput.bind(this),...callback)
    }

    private validatorProductInput: middleWare = (req, res, next) => {
    try {
        const data = this.validator.validate(req.body);
        (req as IRequest<any, any, any, ProductInjection>).productInput = data;
        next();
    } catch (error) {
        const details = this.validator.formatError(error);
        res.status(400).json({ message: "Validation failed", details });
    }

    }

    private createProduct: middleWare = async (req, res) => {
    try {
        // O router extrai o DTO validado (injetado pelo middleware)
        const input = (req as IRequest<any, any, any, ProductInjection>).productInput;
        
        // O controller só recebe o DTO
        const result = await this.productController.create(input);
        
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

private updateProduct: middleWare = async (req, res) => {
    try {
        const { id } = req.params;
        const input = req.body; // DTO de atualização
        
        await this.productController.update(id, input);
        res.status(200).send("Atualizado com sucesso");
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}


}