import { Order } from "../../../domain/entites/Order";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { OrderInput } from "../dto/OrderInput";
import { Product } from "../../../domain/entites/Product";
import { CreateId } from "../../../domain/interface/CreateId";
import { OrderOutput } from "../dto/OrderOutput";

export class CreateOrder {
    constructor(
        private orderRepo: RepositoryPort<Order>,
        private productRepo: RepositoryPort<Product>,
        private createId:CreateId
    ) {}
    async execute(orderInput: OrderInput): Promise<OrderOutput> {
        const orderItems: { productId: string; quantity: number; priceAtPurchase: number }[] = [];
        let total = 0;
        for (const item of orderInput.items) {
            const product = await this.productRepo.findBy({ id: item.productId } as any);

            if (!product) {
                throw new Error(`Produto ${item.productId} não encontrado.`);
            }

            if (product.stock < item.quantity) {
                throw new Error(`Estoque insuficiente para o produto: ${product.name}`);
            }

            const price = parseFloat(product.price);

            orderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                priceAtPurchase: price
            });

            total += (price * item.quantity);
            
            await this.productRepo.update(product.id, { stock: product.stock - item.quantity } as any);
        }
        const order = new Order(
            this.createId(),
            orderInput.userId,
            orderItems,
            total,
            'PENDING'
        );
        await this.orderRepo.save(order);
        return {
        id: order.id,
        userId: order.userId,
        items: order.items,
        total: order.total,
        status: order.status,
        createdAt: order.created_at,
    }
    }
}