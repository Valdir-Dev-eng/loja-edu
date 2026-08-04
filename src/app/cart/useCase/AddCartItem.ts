import { CartItem } from "../../../domain/entites/CartItem";
import { Product } from "../../../domain/entites/Product";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { AddCartItemInput } from "../dto/AddCartItemInput";
import { CartItemOutput } from "../dto/CartItemOutput";

export class AddCartItem {
    constructor(
        private cartItemRepo: RepositoryPort<CartItem>,
        private productRepo: RepositoryPort<Product>,
        private createId: CreateId
    ) {}

    async execute(input: AddCartItemInput): Promise<CartItemOutput> {
        const product = await this.productRepo.findById(input.productId);
        if (!product || product.deleted_at) {
            throw new NotFoundError("Produto não encontrado.");
        }

        const existing = await this.cartItemRepo.findBy({ cartId: input.cartId, productId: input.productId } as never);
        const currentQuantity = existing?.quantity ?? 0;
        const addableQuantity = Math.min(input.quantity, Math.max(product.stock - currentQuantity, 0));
        if (addableQuantity <= 0) {
            throw new BusinessRuleError(`Estoque insuficiente para adicionar mais unidades de: ${product.name}`);
        }

        if (existing) {
            existing.increaseQuantity(addableQuantity);
            await this.cartItemRepo.update(existing.id, { quantity: existing.quantity });
            return this.toOutput(product, existing.quantity);
        }

        const cartItem = CartItem.build(this.createId, input.cartId, input.productId, addableQuantity);
        await this.cartItemRepo.save(cartItem);
        return this.toOutput(product, cartItem.quantity);
    }

    private toOutput(product: Product, quantity: number): CartItemOutput {
        return {
            productId: product.id,
            productName: product.name,
            priceCents: product.priceCents,
            discountCents: product.discountCents,
            stock: product.stock,
            quantity,
        };
    }
}
