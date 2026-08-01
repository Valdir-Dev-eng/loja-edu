import { ProductInput } from "../../app/products/dto/ProductInput";
import { ValidationError } from "../shared/errors/ValidationError";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";
import { FieldDefinition } from "../shared/validators/IFieldsValidator";

export class ProductValidator {
    constructor(private builder: DTOBuilderAndValidator) {
        this.builder.defineSchema(...ProductValidator.createFields(true));
    }

    private static createFields(required: boolean): FieldDefinition[] {
        return [
            { name: "name", type: "string", minLength: 3, maxLength: 150, required },
            { name: "priceCents", type: "number", integer: true, positive: true, required },
            { name: "discountCents", type: "number", integer: true, nonNegative: true, required: false },
            { name: "stock", type: "number", integer: true, nonNegative: true, required },
            { name: "weight", type: "number", positive: true, required },
            { name: "width", type: "number", positive: true, required },
            { name: "height", type: "number", positive: true, required },
            { name: "length", type: "number", positive: true, required },
            { name: "categoryId", type: "string", uuid: true, required: false },
        ];
    }

    validate(data: unknown): ProductInput {
        return this.builder.validateAndTransform(data as ProductInput);
    }

    validateUpdate(data: unknown): Partial<ProductInput> {
        const updateBuilder = new ZodDTOBuilderAndValidator();
        updateBuilder.defineSchema(...ProductValidator.createFields(false));
        return updateBuilder.validateAndTransform(data as Partial<ProductInput>);
    }

    formatError(error: unknown): Record<string, string[]> {
        if (error instanceof ValidationError) {
            const details = error.details as unknown as Record<string, { _errors?: string[] }>;
            const formatted: Record<string, string[]> = {};
            Object.keys(details).forEach((key) => {
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
