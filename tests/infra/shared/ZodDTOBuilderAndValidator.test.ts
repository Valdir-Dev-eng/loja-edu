import { describe, expect, it } from "vitest";
import { ZodDTOBuilderAndValidator } from "../../../src/infra/shared/validators/ZodDTOBuilderAndValidator";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";

const buildValidator = () => {
    const validator = new ZodDTOBuilderAndValidator();
    validator.defineSchema(
        { name: "fullName", type: "string", required: true },
        { name: "complement", type: "string", required: false },
        { name: "stock", type: "number", required: true }
    );
    return validator;
};

const messagesOf = (error: ValidationError, field: string): string[] => {
    const details = error.details as Record<string, { _errors?: string[] }>;
    return details[field]?._errors ?? [];
};

describe("ZodDTOBuilderAndValidator", () => {
    it("aceita dados válidos com campo opcional ausente", () => {
        const validator = buildValidator();

        const result = validator.validateAndTransform({ fullName: "João", stock: 1 });

        expect(result).toEqual({ fullName: "João", stock: 1 });
    });

    it("aceita null em campo opcional sem lançar erro", () => {
        const validator = buildValidator();

        const result = validator.validateAndTransform({ fullName: "João", complement: null, stock: 1 });

        expect(result).toEqual({ fullName: "João", complement: null, stock: 1 });
    });

    it("aceita string em campo opcional", () => {
        const validator = buildValidator();

        const result = validator.validateAndTransform({ fullName: "João", complement: "Apto 12", stock: 1 });

        expect((result as { complement: string }).complement).toBe("Apto 12");
    });

    it("recusa em português quando um campo obrigatório está ausente", () => {
        const validator = buildValidator();
        let caughtError: unknown;

        try {
            validator.validateAndTransform({ stock: 1 });
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(ValidationError);
        expect(messagesOf(caughtError as ValidationError, "fullName")).toEqual(["fullName é obrigatório."]);
    });

    it("recusa em português quando o tipo do campo está errado", () => {
        const validator = buildValidator();
        let caughtError: unknown;

        try {
            validator.validateAndTransform({ fullName: 123, stock: 1 });
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(ValidationError);
        expect(messagesOf(caughtError as ValidationError, "fullName")).toEqual(["fullName deve ser uma string."]);
    });

    it("recusa em português quando null é enviado para campo obrigatório", () => {
        const validator = buildValidator();
        let caughtError: unknown;

        try {
            validator.validateAndTransform({ fullName: null, stock: 1 });
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(ValidationError);
        expect(messagesOf(caughtError as ValidationError, "fullName")).toEqual(["fullName deve ser uma string."]);
    });

    it("recusa em português quando o número obrigatório está ausente", () => {
        const validator = buildValidator();
        let caughtError: unknown;

        try {
            validator.validateAndTransform({ fullName: "João" });
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(ValidationError);
        expect(messagesOf(caughtError as ValidationError, "stock")).toEqual(["stock é obrigatório."]);
    });
});
