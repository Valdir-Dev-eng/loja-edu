import { ProductImage } from "../../../domain/entites/ProductImage";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ProductImageOutput } from "../dto/ProductImageOutput";

export class ListProductImages {
    constructor(private imageRepo: RepositoryPort<ProductImage>) {}

    async execute(productId: string): Promise<ProductImageOutput[]> {
        const images = await this.imageRepo.findMany({ productId });
        return images
            .slice()
            .sort((first, second) => first.order - second.order)
            .map((image) => ({
                id: image.id,
                productId: image.productId,
                url: image.url,
                order: image.order,
                altText: image.altText,
            }));
    }
}
