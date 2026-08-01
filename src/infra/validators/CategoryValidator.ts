import { CategoryInput } from "../../app/categories/dto/CategoryInput";
import { ValidationError } from "../shared/errors/ValidationError";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";

export class CategoryValidator {
    private createBuilder(): DTOBuilderAndValidator {
        return new ZodDTOBuilderAndValidator();
    }

    validate(data: unknown): CategoryInput {
        const builder = this.createBuilder();
        builder.defineSchema(
            { name: "name", type: "string", minLength: 1, maxLength: 150, required: true },
            { name: "description", type: "string", maxLength: 1000, required: false }
        );
        const validated = builder.validateAndTransform(data as CategoryInput);
        return { ...validated, description: validated.description ?? null };
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
