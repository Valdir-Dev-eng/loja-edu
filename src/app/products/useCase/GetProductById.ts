import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ProductOutput } from "../dto/ProductOutput";

export class GetProductById {
    constructor(private repo: RepositoryPort<Product>) {}

    async execute(id: string): Promise<ProductOutput> {
        const product = await this.repo.findById(id);
        if (!product) {
            throw new NotFoundError("Produto não encontrado.");
        }
        return {
            id: product.id,
            name: product.name,
            priceCents: product.priceCents,
            discountCents: product.discountCents,
            stock: product.stock,
            weight: product.weight,
            width: product.width,
            height: product.height,
            length: product.length,
            categoryId: product.categoryId,
        };
    }
}
