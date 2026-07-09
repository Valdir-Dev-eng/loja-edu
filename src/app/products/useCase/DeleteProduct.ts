import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { Product } from "../../../domain/entites/Product";

export class DeleteProduct {
    constructor(private repo: RepositoryPort<Product>) {}

    async execute(id: string): Promise<void> {
        const product = await this.repo.findById(id);
        
        if (!product) {
            throw new Error("Produto não encontrado.");
        }

        product.softDelete();

        await this.repo.update(id, product);
    }
}