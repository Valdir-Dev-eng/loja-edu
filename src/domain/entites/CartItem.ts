import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

export class CartItem {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly productId: string,
        public quantity: number,
        public readonly created_at: Date = new Date(),
        public updated_at: Date = new Date(),
        private _deleted_at: Date | null = null
    ) {}

    get deleted_at(): Date | null {
        return this._deleted_at;
    }

    static build(createId: CreateId, userId: string, productId: string, quantity: number): CartItem {
        CartItem.assertValidQuantity(quantity);
        return new CartItem(createId(), userId, productId, quantity);
    }

    private static assertValidQuantity(quantity: number): void {
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new BusinessRuleError("Quantidade deve ser um número inteiro maior que zero.");
        }
    }

    increaseQuantity(amount: number): void {
        CartItem.assertValidQuantity(amount);
        this.quantity += amount;
        this.updated_at = new Date();
    }

    changeQuantity(quantity: number): void {
        CartItem.assertValidQuantity(quantity);
        this.quantity = quantity;
        this.updated_at = new Date();
    }

    softDelete(): void {
        if (this._deleted_at) {
            throw new ConflictError("Item já foi removido do carrinho.");
        }
        this._deleted_at = new Date();
    }
}
