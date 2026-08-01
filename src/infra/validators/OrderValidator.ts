import { CheckoutOrderInput } from "../../app/orders/dto/CheckoutOrderInput";
import { ValidationError } from "../shared/errors/ValidationError";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";

export type CheckoutOrderData = Omit<CheckoutOrderInput, "userId">;

export class OrderValidator {
    private createBuilder(): DTOBuilderAndValidator {
        return new ZodDTOBuilderAndValidator();
    }

    validateCheckout(data: unknown): CheckoutOrderData {
        const builder = this.createBuilder();
        builder.defineSchema(
            {
                name: "addressId",
                type: "string",
                required: true,
                uuid: true,
                message: "O ID do endereço deve ser um UUID válido.",
            } as any,
            {
                name: "shippingServiceId",
                type: "number",
                required: true,
                positive: true,
                integer: true,
                message: "A opção de frete selecionada é inválida.",
            } as any,
            {
                name: "items",
                type: "array",
                required: true,
                requiredMessage: "A lista de itens é obrigatória.",
                minItems: 1,
                minItemsMessage: "É necessário informar ao menos um item.",
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
        return { general: ["Ocorreu um erro inesperado na validação dos dados."] };
    }
}
