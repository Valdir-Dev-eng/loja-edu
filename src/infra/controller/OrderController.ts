import { OrderInput } from "../../app/orders/dto/OrderInput";
import { OrderOutput } from "../../app/orders/dto/OrderOutput";
import { CreateOrder } from "../../app/orders/useCase/CreateOrder";

export class OrderController {
    constructor(private orderCreate:CreateOrder) {

    }
    async createOrder(order:OrderInput):Promise<OrderOutput>{
        return await this.orderCreate.execute(order)
    }
}