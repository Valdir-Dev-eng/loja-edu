import { describe, expect, it } from "vitest";
import { ProductValidator } from "../../../src/infra/validators/ProductValidator";
import { ZodDTOBuilderAndValidator } from "../../../src/infra/shared/validators/ZodDTOBuilderAndValidator";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";

const validProduct = {
    name: "Dipirona",
    priceCents: 1990,
    discountCents: null,
    stock: 10,
    weight: 0.1,
    width: 5,
    height: 5,
    length: 10,
    categoryId: null,
};

const buildValidator = () => new ProductValidator(new ZodDTOBuilderAndValidator());

describe("ProductValidator", () => {
    describe("validate", () => {
        it("aceita um produto com todos os campos válidos", () => {
            const validator = buildValidator();

            const result = validator.validate(validProduct);

            expect(result.priceCents).toBe(1990);
            expect(result.weight).toBe(0.1);
        });

        it("recusa produto sem peso", () => {
            const validator = buildValidator();
            const { weight, ...withoutWeight } = validProduct;

            expect(() => validator.validate(withoutWeight)).toThrow(ValidationError);
        });

        it("recusa produto com largura zero ou negativa", () => {
            const validator = buildValidator();

            expect(() => validator.validate({ ...validProduct, width: 0 })).toThrow(ValidationError);
        });

        it("recusa produto com preço não inteiro", () => {
            const validator = buildValidator();

            expect(() => validator.validate({ ...validProduct, priceCents: 19.9 })).toThrow(ValidationError);
        });
    });

    describe("validateUpdate", () => {
        it("aceita atualização parcial só com o estoque", () => {
            const validator = buildValidator();

            const result = validator.validateUpdate({ stock: 3 });

            expect(result).toEqual({ stock: 3 });
        });

        it("recusa atualização com peso inválido mesmo em update parcial", () => {
            const validator = buildValidator();

            expect(() => validator.validateUpdate({ weight: 0 })).toThrow(ValidationError);
        });

        it("não exige os demais campos quando só um é enviado", () => {
            const validator = buildValidator();

            expect(() => validator.validateUpdate({ name: "Novo nome" })).not.toThrow();
        });
    });

    describe("formatError", () => {
        it("agrupa mensagens de erro por campo em português", () => {
            const validator = buildValidator();

            try {
                validator.validate({ ...validProduct, weight: 0 });
                throw new Error("deveria ter lançado ValidationError");
            } catch (error) {
                const formatted = validator.formatError(error);
                expect(formatted.weight).toBeTruthy();
            }
        });

        it("devolve mensagem genérica para erro que não é ValidationError", () => {
            const validator = buildValidator();

            const formatted = validator.formatError(new Error("outro erro"));

            expect(formatted.general).toEqual(["Erro de validação desconhecido"]);
        });
    });
});
