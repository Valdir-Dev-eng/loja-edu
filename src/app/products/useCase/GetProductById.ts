import { Product } from "../../../domain/entites/Product";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";

export class GetProductById {
    constructor(private repo: RepositoryPort<Product>) {}

    async execute(id: string): Promise<Product | undefined> {
        return await this.repo.findById(id);
    }
}