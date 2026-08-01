import { ProductInput } from "../../app/products/dto/ProductInput";
import { CreateProduct } from "../../app/products/useCase/CreateProduct";
import { DeleteProduct } from "../../app/products/useCase/DeleteProduct";
import { UpdateProduct } from "../../app/products/useCase/UpdateProduct";
import { GetProductById } from "../../app/products/useCase/GetProductById";
import { GetAllProducts } from "../../app/products/useCase/GetAllProducts";

export class ProductController {
    constructor(
private createProduct:CreateProduct,
private deleteProduct:DeleteProduct,
private updateProduct:UpdateProduct,
private getProductById:GetProductById,
private getAllProducts:GetAllProducts,
    ) {}

    async create(input: ProductInput) {
        return await this.createProduct.execute(input);
    }

    async update(id: string, input: Partial<ProductInput>) {
        return await this.updateProduct.execute(id, input);
    }

    async delete(id: string) {
        return await this.deleteProduct.execute(id);
    }

    async getById(id: string) {
        
        return await this.getProductById.execute(id);
    }

    async getAll() {
        return await this.getAllProducts.execute();
    }
}