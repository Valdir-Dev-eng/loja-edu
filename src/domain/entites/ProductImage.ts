import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

export class ProductImage {
    constructor(
        public readonly id: string,
        public readonly productId: string,
        public readonly url: string,
        public order: number,
        public altText: string | null,
        public readonly created_at: Date = new Date(),
        public updated_at: Date = new Date(),
        private _deleted_at: Date | null = null
    ) {}

    get deleted_at(): Date | null {
        return this._deleted_at;
    }

    static build(
        createId: CreateId,
        productId: string,
        url: string,
        order: number,
        altText: string | null
    ): ProductImage {
        if (!url || url.trim().length === 0) {
            throw new BusinessRuleError("URL da imagem é obrigatória.");
        }
        if (!Number.isInteger(order) || order < 0) {
            throw new BusinessRuleError("Ordem da imagem inválida.");
        }
        return new ProductImage(createId(), productId, url, order, altText);
    }

    softDelete(): void {
        if (this._deleted_at) {
            throw new ConflictError("Imagem já está deletada.");
        }
        this._deleted_at = new Date();
    }
}
