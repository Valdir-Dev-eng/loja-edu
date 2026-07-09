import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { Product } from "../../../domain/entites/Product"
import { ProductInput } from "../dto/ProductInput";

export class UpdateProduct {
    constructor(private repo: RepositoryPort<Product>) {}

    async execute(id: string, input: Partial<ProductInput>) {
        const product = await this.repo.findById(id);
        if (!product) throw new Error("Produto não encontrado.");

        if (input.name) product.name = input.name;
        if (input.price) product.price = input.price;
        if (input.stock !== undefined) product.stock = input.stock;

        product.markAsUpdated();

        await this.repo.update(id, product);
    }
}