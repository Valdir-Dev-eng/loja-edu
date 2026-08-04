import { CartItem } from "../../../domain/entites/CartItem";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";

export class ClearCart {
    constructor(private cartItemRepo: RepositoryPort<CartItem>) {}

    async execute(userId: string): Promise<void> {
        const items = await this.cartItemRepo.findMany({ userId } as never);
        await Promise.all(items.map((item) => this.cartItemRepo.delete(item.id)));
    }
}
