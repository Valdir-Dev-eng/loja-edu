import { CartItemOutput } from "../../app/cart/dto/CartItemOutput";
import { AddCartItem } from "../../app/cart/useCase/AddCartItem";
import { AttachCartToUser } from "../../app/cart/useCase/AttachCartToUser";
import { ListCart } from "../../app/cart/useCase/ListCart";
import { RemoveCartItem } from "../../app/cart/useCase/RemoveCartItem";
import { ResolveCart } from "../../app/cart/useCase/ResolveCart";
import { UpdateCartItemQuantity } from "../../app/cart/useCase/UpdateCartItemQuantity";
import { Cart } from "../../domain/entites/Cart";

export class CartController {
    constructor(
        private resolveCart: ResolveCart,
        private listCart: ListCart,
        private addCartItem: AddCartItem,
        private updateCartItemQuantity: UpdateCartItemQuantity,
        private removeCartItem: RemoveCartItem,
        private attachCartToUser: AttachCartToUser
    ) {}

    async resolve(cartIdFromCookie: string | null, userId: string | null, createIfMissing: boolean): Promise<Cart | null> {
        return await this.resolveCart.execute({ cartIdFromCookie, userId, createIfMissing });
    }

    async list(cartId: string): Promise<CartItemOutput[]> {
        return await this.listCart.execute(cartId);
    }

    async add(cartId: string, productId: string, quantity: number): Promise<CartItemOutput> {
        return await this.addCartItem.execute({ cartId, productId, quantity });
    }

    async updateQuantity(cartId: string, productId: string, quantity: number): Promise<CartItemOutput | null> {
        return await this.updateCartItemQuantity.execute({ cartId, productId, quantity });
    }

    async remove(cartId: string, productId: string): Promise<void> {
        await this.removeCartItem.execute({ cartId, productId });
    }

    async attachToUser(cartIdFromCookie: string | null, userId: string): Promise<void> {
        await this.attachCartToUser.execute({ cartIdFromCookie, userId });
    }
}
