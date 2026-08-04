import { MergeCartItemInput } from "../../app/cart/dto/MergeCartInput";
import { ValidationError } from "../shared/errors/ValidationError";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";

const MAX_QUANTITY_PER_ITEM = 999;
const MAX_MERGE_ITEMS = 100;

export interface AddCartItemBody {
    productId: string;
    quantity: number;
}

export interface UpdateCartItemBody {
    quantity: number;
}

export interface MergeCartBody {
    items: MergeCartItemInput[];
}

export class CartValidator {
    private createBuilder(): DTOBuilderAndValidator {
        return new ZodDTOBuilderAndValidator();
    }

    validateAdd(data: unknown): AddCartItemBody {
        const builder = this.createBuilder();
        builder.defineSchema(
            { name: "productId", type: "string", uuid: true, required: true },
            { name: "quantity", type: "number", integer: true, positive: true, max: MAX_QUANTITY_PER_ITEM, required: true }
        );
        return builder.validateAndTransform(data as AddCartItemBody);
    }

    validateUpdateQuantity(data: unknown): UpdateCartItemBody {
        const builder = this.createBuilder();
        builder.defineSchema({
            name: "quantity",
            type: "number",
            integer: true,
            nonNegative: true,
            max: MAX_QUANTITY_PER_ITEM,
            required: true,
        });
        return builder.validateAndTransform(data as UpdateCartItemBody);
    }

    validateMerge(data: unknown): MergeCartBody {
        const shapeBuilder = this.createBuilder();
        shapeBuilder.defineSchema({
            name: "items",
            type: "array",
            maxItems: MAX_MERGE_ITEMS,
            maxItemsMessage: `No máximo ${MAX_MERGE_ITEMS} itens por vez.`,
            required: true,
            items: { name: "item", type: "any" },
        });
        const shape = shapeBuilder.validateAndTransform(data as { items: unknown[] });

        return { items: shape.items.map((item) => this.validateMergeItem(item)) };
    }

    private validateMergeItem(data: unknown): MergeCartItemInput {
        const builder = this.createBuilder();
        builder.defineSchema(
            { name: "productId", type: "string", uuid: true, required: true },
            { name: "quantity", type: "number", integer: true, positive: true, max: MAX_QUANTITY_PER_ITEM, required: true }
        );
        return builder.validateAndTransform(data as MergeCartItemInput);
    }

    formatError(error: unknown): Record<string, string[]> {
        if (error instanceof ValidationError) {
            const details = error.details as unknown as Record<string, { _errors?: string[] }>;
            const formatted: Record<string, string[]> = {};
            Object.keys(details).forEach((key: string) => {
                if (key === "_errors") return;
                const fieldError = details[key];
                if (fieldError && Array.isArray(fieldError._errors)) {
                    formatted[key] = fieldError._errors;
                }
            });
            return formatted;
        }
        return { general: ["Erro de validação desconhecido"] };
    }
}
