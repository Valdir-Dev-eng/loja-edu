import { CartItem } from "../../../domain/entites/CartItem";
import { Product } from "../../../domain/entites/Product";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { CartItemOutput } from "../dto/CartItemOutput";
import { MergeCartInput } from "../dto/MergeCartInput";

export class MergeCart {
    constructor(
        private cartItemRepo: RepositoryPort<CartItem>,
        private productRepo: RepositoryPort<Product>,
        private createId: CreateId
    ) {}

    async execute(input: MergeCartInput): Promise<CartItemOutput[]> {
        const productIds = input.items.map((item) => item.productId);
        const products = await this.productRepo.findManyByIds(productIds);
        const productsById = new Map(products.map((product) => [product.id, product]));
        const existingItems = await this.cartItemRepo.findMany({ userId: input.userId } as never);
        const existingByProductId = new Map(existingItems.map((item) => [item.productId, item]));

        await Promise.all(
            input.items.map((incoming) => this.mergeOne(input.userId, incoming, productsById, existingByProductId))
        );

        const cartItems = await this.cartItemRepo.findMany({ userId: input.userId } as never);
        const mergedProducts = await this.productRepo.findManyByIds(cartItems.map((item) => item.productId));
        const mergedProductsById = new Map(mergedProducts.map((product) => [product.id, product]));
        return cartItems
            .map((item) => this.toOutput(item, mergedProductsById.get(item.productId)))
            .filter((output): output is CartItemOutput => output !== null);
    }

    private async mergeOne(
        userId: string,
        incoming: MergeCartInput["items"][number],
        productsById: Map<string, Product>,
        existingByProductId: Map<string, CartItem>
    ): Promise<void> {
        const product = productsById.get(incoming.productId);
        if (!product || product.deleted_at) {
            return;
        }

        const existing = existingByProductId.get(incoming.productId);
        const currentQuantity = existing?.quantity ?? 0;
        const nextQuantity = Math.min(currentQuantity + incoming.quantity, product.stock);
        if (nextQuantity <= 0) {
            return;
        }

        if (existing) {
            existing.changeQuantity(nextQuantity);
            await this.cartItemRepo.update(existing.id, { quantity: nextQuantity });
            return;
        }
        const cartItem = CartItem.build(this.createId, userId, incoming.productId, nextQuantity);
        await this.cartItemRepo.save(cartItem);
    }

    private toOutput(item: CartItem, product: Product | undefined): CartItemOutput | null {
        if (!product) {
            return null;
        }
        return {
            productId: product.id,
            productName: product.name,
            priceCents: product.priceCents,
            discountCents: product.discountCents,
            stock: product.stock,
            quantity: item.quantity,
        };
    }
}
