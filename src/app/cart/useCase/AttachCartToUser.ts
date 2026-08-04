import { Cart } from "../../../domain/entites/Cart";
import { CartItem } from "../../../domain/entites/CartItem";
import { Product } from "../../../domain/entites/Product";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";

export interface AttachCartToUserInput {
    /** Vem só do cookie presente no exato momento do callback do login —
     * nunca aceito como parâmetro vindo de fora dessa chamada interna,
     * pra ninguém conseguir forjar "anexa o carrinho X à minha conta". */
    cartIdFromCookie: string | null;
    userId: string;
}

export class AttachCartToUser {
    constructor(
        private cartRepo: RepositoryPort<Cart>,
        private cartItemRepo: RepositoryPort<CartItem>,
        private productRepo: RepositoryPort<Product>,
        private createId: CreateId
    ) {}

    async execute(input: AttachCartToUserInput): Promise<void> {
        if (!input.cartIdFromCookie) {
            return;
        }
        const anonymousCart = await this.cartRepo.findById(input.cartIdFromCookie);
        if (!anonymousCart || anonymousCart.deleted_at || anonymousCart.userId) {
            return;
        }

        const existingUserCart = await this.cartRepo.findBy({ userId: input.userId } as never);
        if (!existingUserCart) {
            anonymousCart.attachUser(input.userId);
            await this.cartRepo.update(anonymousCart.id, { userId: anonymousCart.userId });
            return;
        }

        await this.mergeItems(anonymousCart.id, existingUserCart.id);
        await this.cartRepo.delete(anonymousCart.id);
    }

    private async mergeItems(fromCartId: string, intoCartId: string): Promise<void> {
        const anonymousItems = await this.cartItemRepo.findMany({ cartId: fromCartId } as never);
        if (anonymousItems.length === 0) {
            return;
        }
        const products = await this.productRepo.findManyByIds(anonymousItems.map((item) => item.productId));
        const productsById = new Map(products.map((product) => [product.id, product]));
        const existingItems = await this.cartItemRepo.findMany({ cartId: intoCartId } as never);
        const existingByProductId = new Map(existingItems.map((item) => [item.productId, item]));

        await Promise.all(
            anonymousItems.map((item) =>
                this.mergeOne(intoCartId, item, productsById.get(item.productId), existingByProductId.get(item.productId))
            )
        );
    }

    private async mergeOne(
        intoCartId: string,
        anonymousItem: CartItem,
        product: Product | undefined,
        existing: CartItem | undefined
    ): Promise<void> {
        if (!product || product.deleted_at) {
            return;
        }
        const currentQuantity = existing?.quantity ?? 0;
        const nextQuantity = Math.min(currentQuantity + anonymousItem.quantity, product.stock);
        if (nextQuantity <= 0) {
            return;
        }
        if (existing) {
            existing.changeQuantity(nextQuantity);
            await this.cartItemRepo.update(existing.id, { quantity: nextQuantity });
            return;
        }
        const merged = CartItem.build(this.createId, intoCartId, product.id, nextQuantity);
        await this.cartItemRepo.save(merged);
    }
}
