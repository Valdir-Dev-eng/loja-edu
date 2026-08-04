import { CartItemOutput } from "../../app/cart/dto/CartItemOutput";
import { MergeCartItemInput } from "../../app/cart/dto/MergeCartInput";
import { AddCartItem } from "../../app/cart/useCase/AddCartItem";
import { ListCart } from "../../app/cart/useCase/ListCart";
import { MergeCart } from "../../app/cart/useCase/MergeCart";
import { RemoveCartItem } from "../../app/cart/useCase/RemoveCartItem";
import { UpdateCartItemQuantity } from "../../app/cart/useCase/UpdateCartItemQuantity";

export class CartController {
    constructor(
        private listCart: ListCart,
        private addCartItem: AddCartItem,
        private updateCartItemQuantity: UpdateCartItemQuantity,
        private removeCartItem: RemoveCartItem,
        private mergeCart: MergeCart
    ) {}

    async list(userId: string): Promise<CartItemOutput[]> {
        return await this.listCart.execute(userId);
    }

    async add(userId: string, productId: string, quantity: number): Promise<CartItemOutput> {
        return await this.addCartItem.execute({ userId, productId, quantity });
    }

    async updateQuantity(userId: string, productId: string, quantity: number): Promise<CartItemOutput | null> {
        return await this.updateCartItemQuantity.execute({ userId, productId, quantity });
    }

    async remove(userId: string, productId: string): Promise<void> {
        await this.removeCartItem.execute({ userId, productId });
    }

    async merge(userId: string, items: MergeCartItemInput[]): Promise<CartItemOutput[]> {
        return await this.mergeCart.execute({ userId, items });
    }
}
