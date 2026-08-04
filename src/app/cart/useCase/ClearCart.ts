import { Cart } from "../../../domain/entites/Cart";
import { CartItem } from "../../../domain/entites/CartItem";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";

export class ClearCart {
    constructor(
        private cartRepo: RepositoryPort<Cart>,
        private cartItemRepo: RepositoryPort<CartItem>
    ) {}

    async execute(userId: string): Promise<void> {
        const cart = await this.cartRepo.findBy({ userId } as never);
        if (!cart) {
            return;
        }
        const items = await this.cartItemRepo.findMany({ cartId: cart.id } as never);
        await Promise.all(items.map((item) => this.cartItemRepo.delete(item.id)));
    }
}
