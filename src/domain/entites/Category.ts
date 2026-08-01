import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

export class Category {
    constructor(
        public readonly id: string,
        public name: string,
        public description: string | null,
        public readonly created_at: Date = new Date(),
        public updated_at: Date = new Date(),
        private _deleted_at: Date | null = null
    ) {}

    get deleted_at(): Date | null {
        return this._deleted_at;
    }

    static build(createId: CreateId, name: string, description: string | null): Category {
        if (!name || name.trim().length === 0) {
            throw new BusinessRuleError("Nome da categoria é obrigatório.");
        }
        return new Category(createId(), name, description);
    }

    softDelete(): void {
        if (this._deleted_at) {
            throw new ConflictError("Categoria já está deletada.");
        }
        this._deleted_at = new Date();
    }
}
