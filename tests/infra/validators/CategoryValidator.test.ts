import { describe, expect, it } from "vitest";
import { CategoryValidator } from "../../../src/infra/validators/CategoryValidator";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";

describe("CategoryValidator", () => {
    describe("validate", () => {
        it("aceita categoria válida com descrição", () => {
            const validator = new CategoryValidator();

            const result = validator.validate({ name: "Medicamentos", description: "Uso contínuo" });

            expect(result).toEqual({ name: "Medicamentos", description: "Uso contínuo" });
        });

        it("normaliza descrição ausente para null", () => {
            const validator = new CategoryValidator();

            const result = validator.validate({ name: "Medicamentos" });

            expect(result.description).toBeNull();
        });

        it("recusa nome ausente", () => {
            const validator = new CategoryValidator();

            expect(() => validator.validate({ description: "sem nome" })).toThrow(ValidationError);
        });

        it("recusa nome maior que o limite máximo", () => {
            const validator = new CategoryValidator();

            expect(() => validator.validate({ name: "a".repeat(151) })).toThrow(ValidationError);
        });
    });

    describe("formatError", () => {
        it("formata um ValidationError em um mapa de campo para lista de mensagens", () => {
            const validator = new CategoryValidator();
            let caughtError: unknown;

            try {
                validator.validate({ description: "sem nome" });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.name).toBeDefined();
        });

        it("retorna mensagem genérica quando o erro não é um ValidationError", () => {
            const validator = new CategoryValidator();

            const formatted = validator.formatError(new Error("erro qualquer"));

            expect(formatted).toEqual({ general: ["Erro de validação desconhecido"] });
        });
    });
});
