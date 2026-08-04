import { CartItem } from "../../../domain/entites/CartItem";
import { Product } from "../../../domain/entites/Product";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { CartItemOutput } from "../dto/CartItemOutput";
import { UpdateCartItemInput } from "../dto/UpdateCartItemInput";

export class UpdateCartItemQuantity {
    constructor(
        private cartItemRepo: RepositoryPort<CartItem>,
        private productRepo: RepositoryPort<Product>
    ) {}

    async execute(input: UpdateCartItemInput): Promise<CartItemOutput | null> {
        const existing = await this.cartItemRepo.findBy({ userId: input.userId, productId: input.productId } as never);
        if (!existing) {
            throw new NotFoundError("Item não encontrado no carrinho.");
        }

        if (input.quantity <= 0) {
            existing.softDelete();
            await this.cartItemRepo.delete(existing.id);
            return null;
        }

        const product = await this.productRepo.findById(input.productId);
        if (!product || product.deleted_at) {
            throw new NotFoundError("Produto não encontrado.");
        }

        const clampedQuantity = Math.min(input.quantity, product.stock);
        existing.changeQuantity(clampedQuantity);
        await this.cartItemRepo.update(existing.id, { quantity: existing.quantity });

        return {
            productId: product.id,
            productName: product.name,
            priceCents: product.priceCents,
            discountCents: product.discountCents,
            stock: product.stock,
            quantity: existing.quantity,
        };
    }
}
