import { CalculateShippingInput } from "../../app/shipping/dto/CalculateShippingInput";
import { ValidationError } from "../shared/errors/ValidationError";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";

export class ShippingValidator {
    private createBuilder(): DTOBuilderAndValidator {
        return new ZodDTOBuilderAndValidator();
    }

    validateQuote(data: unknown): CalculateShippingInput {
        const builder = this.createBuilder();
        builder.defineSchema(
            {
                name: "destinationPostalCode",
                type: "string",
                pattern: /^\d{8}$/,
                patternMessage: "CEP deve conter 8 dígitos.",
                required: true,
            } as any,
            {
                name: "items",
                type: "array",
                required: true,
                requiredMessage: "A lista de itens é obrigatória.",
                minItems: 1,
                minItemsMessage: "É necessário informar ao menos um item.",
                maxItems: 50,
                maxItemsMessage: "A lista de itens pode ter no máximo 50 produtos.",
                items: {
                    name: "item",
                    type: "object",
                    required: true,
                    fields: [
                        {
                            name: "productId",
                            type: "string",
                            required: true,
                            uuid: true,
                            message: "O ID do produto deve ser um UUID válido.",
                        },
                        {
                            name: "quantity",
                            type: "number",
                            required: true,
                            positive: true,
                            integer: true,
                            message: "A quantidade deve ser um número inteiro positivo.",
                        },
                    ],
                },
            } as any
        );
        return builder.validateAndTransform(data as any);
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
