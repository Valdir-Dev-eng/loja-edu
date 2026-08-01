import { describe, expect, it } from "vitest";
import { AddressValidator } from "../../../src/infra/validators/AddressValidator";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";

const validAddress = {
    recipientName: "João da Silva",
    zipCode: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    label: "Casa",
};

describe("AddressValidator", () => {
    describe("validateCreate", () => {
        it("aceita dados válidos e transforma no DTO de endereço", () => {
            const validator = new AddressValidator();

            const result = validator.validateCreate(validAddress);

            expect(result.zipCode).toBe("01310100");
            expect(result.label).toBe("Casa");
            expect(result.complement).toBeNull();
        });

        it("preserva o complemento quando informado", () => {
            const validator = new AddressValidator();

            const result = validator.validateCreate({ ...validAddress, complement: "Apto 12" });

            expect(result.complement).toBe("Apto 12");
        });

        it("recusa CEP fora do formato esperado", () => {
            const validator = new AddressValidator();

            expect(() => validator.validateCreate({ ...validAddress, zipCode: "123" })).toThrow(ValidationError);
        });

        it("recusa UF fora do padrão de duas letras maiúsculas", () => {
            const validator = new AddressValidator();

            expect(() => validator.validateCreate({ ...validAddress, state: "sp" })).toThrow(ValidationError);
        });

        it("recusa endereço sem identificação (label)", () => {
            const validator = new AddressValidator();
            const { label, ...withoutLabel } = validAddress;

            expect(() => validator.validateCreate(withoutLabel)).toThrow(ValidationError);
        });

        it("recusa endereço sem destinatário", () => {
            const validator = new AddressValidator();
            const { recipientName, ...withoutRecipient } = validAddress;

            expect(() => validator.validateCreate(withoutRecipient)).toThrow(ValidationError);
        });
    });

    describe("formatError", () => {
        it("formata um ValidationError em um mapa de campo para lista de mensagens", () => {
            const validator = new AddressValidator();
            let caughtError: unknown;

            try {
                validator.validateCreate({ ...validAddress, zipCode: "123" });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.zipCode).toBeDefined();
        });

        it("retorna mensagem genérica quando o erro não é um ValidationError", () => {
            const validator = new AddressValidator();

            const formatted = validator.formatError(new Error("erro qualquer"));

            expect(formatted).toEqual({ general: ["Erro de validação desconhecido"] });
        });
    });
});
