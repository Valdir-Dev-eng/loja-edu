import { AddressInput } from "../../app/users/dto/AddressInput";
import { ValidationError } from "../shared/errors/ValidationError";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";

export class AddressValidator {
    private createBuilder(): DTOBuilderAndValidator {
        return new ZodDTOBuilderAndValidator();
    }

    validateCreate(data: unknown): AddressInput {
        const builder = this.createBuilder();
        builder.defineSchema(
            { name: "recipientName", type: "string", minLength: 3, maxLength: 150, required: true },
            { name: "zipCode", type: "string", pattern: /^\d{8}$/, patternMessage: "CEP deve conter 8 dígitos.", required: true },
            { name: "street", type: "string", minLength: 1, maxLength: 150, required: true },
            { name: "number", type: "string", minLength: 1, maxLength: 20, required: true },
            { name: "complement", type: "string", maxLength: 150, required: false },
            { name: "neighborhood", type: "string", minLength: 1, maxLength: 100, required: true },
            { name: "city", type: "string", minLength: 1, maxLength: 100, required: true },
            { name: "state", type: "string", pattern: /^[A-Z]{2}$/, patternMessage: "UF deve ter duas letras maiúsculas.", required: true },
            { name: "label", type: "string", minLength: 1, maxLength: 50, required: true }
        );
        const validated = builder.validateAndTransform(data as AddressInput);
        return { ...validated, complement: validated.complement ?? null };
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
