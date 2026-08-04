import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

export class Cart {
    constructor(
        public readonly id: string,
        public userId: string | null,
        public readonly created_at: Date = new Date(),
        public updated_at: Date = new Date(),
        private _deleted_at: Date | null = null
    ) {}

    get deleted_at(): Date | null {
        return this._deleted_at;
    }

    static build(createId: CreateId): Cart {
        return new Cart(createId(), null);
    }

    attachUser(userId: string): void {
        if (this.userId) {
            throw new ConflictError("Carrinho já pertence a um usuário.");
        }
        this.userId = userId;
        this.updated_at = new Date();
    }

    belongsTo(userId: string | null): boolean {
        if (!this.userId) {
            return true;
        }
        return this.userId === userId;
    }

    softDelete(): void {
        if (this._deleted_at) {
            throw new ConflictError("Carrinho já está deletado.");
        }
        this._deleted_at = new Date();
    }
}
