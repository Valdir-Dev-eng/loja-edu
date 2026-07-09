import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { Product } from "../../../domain/entites/Product"
import { ProductInput } from "../dto/ProductInput";

export class CreateProduct {
    constructor(private repo: RepositoryPort<Product>, private createId: () => string) {}

    async execute(input: ProductInput) {
        
        const alreadyExists = await this.repo.exists({ name: input.name });
        if (alreadyExists) throw new Error("Produto já cadastrado.");

        const product = Product.build(this.createId, input.name, input.price, input.discount, input.stock);
        await this.repo.save(product);
    }
}