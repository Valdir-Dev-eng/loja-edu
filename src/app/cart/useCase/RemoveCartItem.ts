import { CartItem } from "../../../domain/entites/CartItem";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";

export interface RemoveCartItemInput {
    userId: string;
    productId: string;
}

export class RemoveCartItem {
    constructor(private cartItemRepo: RepositoryPort<CartItem>) {}

    async execute(input: RemoveCartItemInput): Promise<void> {
        const existing = await this.cartItemRepo.findBy({ userId: input.userId, productId: input.productId } as never);
        if (!existing) {
            throw new NotFoundError("Item não encontrado no carrinho.");
        }
        existing.softDelete();
        await this.cartItemRepo.delete(existing.id);
    }
}
