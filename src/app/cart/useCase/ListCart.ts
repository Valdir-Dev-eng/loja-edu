import { CartItem } from "../../../domain/entites/CartItem";
import { Product } from "../../../domain/entites/Product";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { CartItemOutput } from "../dto/CartItemOutput";

export class ListCart {
    constructor(
        private cartItemRepo: RepositoryPort<CartItem>,
        private productRepo: RepositoryPort<Product>
    ) {}

    async execute(cartId: string): Promise<CartItemOutput[]> {
        const cartItems = await this.cartItemRepo.findMany({ cartId } as never);
        if (cartItems.length === 0) {
            return [];
        }
        const products = await this.productRepo.findManyByIds(cartItems.map((item) => item.productId));
        const productsById = new Map(products.map((product) => [product.id, product]));

        return cartItems
            .map((item) => this.toOutput(item, productsById.get(item.productId)))
            .filter((output): output is CartItemOutput => output !== null);
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
