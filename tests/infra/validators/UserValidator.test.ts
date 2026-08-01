import { describe, expect, it } from "vitest";
import { UserValidator } from "../../../src/infra/validators/UserValidator";
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

describe("UserValidator", () => {
    describe("validateOnboarding", () => {
        it("aceita dados válidos e transforma no DTO de onboarding", () => {
            const validator = new UserValidator();

            const result = validator.validateOnboarding({
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [validAddress],
            });

            expect(result.fullName).toBe("João da Silva");
            expect(result.document).toBe("52998224725");
            expect(result.addresses).toHaveLength(1);
            expect(result.addresses[0].zipCode).toBe("01310100");
        });

        it("normaliza endereço sem complemento para null", () => {
            const validator = new UserValidator();

            const result = validator.validateOnboarding({
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [validAddress],
            });

            expect(result.addresses[0].complement).toBeNull();
        });

        it("preserva o complemento quando informado", () => {
            const validator = new UserValidator();

            const result = validator.validateOnboarding({
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [{ ...validAddress, complement: "Apto 12" }],
            });

            expect(result.addresses[0].complement).toBe("Apto 12");
        });

        it("aceita complemento explicitamente null", () => {
            const validator = new UserValidator();

            const result = validator.validateOnboarding({
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [{ ...validAddress, complement: null }],
            });

            expect(result.addresses[0].complement).toBeNull();
        });

        it("aceita documento de 14 dígitos (CNPJ)", () => {
            const validator = new UserValidator();

            const result = validator.validateOnboarding({
                fullName: "João da Silva",
                document: "11222333000181",
                addresses: [validAddress],
            });

            expect(result.document).toBe("11222333000181");
        });

        it("recusa documento com quantidade de dígitos inválida", () => {
            const validator = new UserValidator();

            expect(() =>
                validator.validateOnboarding({
                    fullName: "João da Silva",
                    document: "123",
                    addresses: [validAddress],
                })
            ).toThrow(ValidationError);
        });

        it("recusa em português quando o nome completo está ausente", () => {
            const validator = new UserValidator();
            let caughtError: unknown;

            try {
                validator.validateOnboarding({ document: "52998224725", addresses: [validAddress] });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.fullName).toEqual(["fullName é obrigatório."]);
        });

        it("recusa em português quando o nome completo tem tipo errado", () => {
            const validator = new UserValidator();
            let caughtError: unknown;

            try {
                validator.validateOnboarding({ fullName: 123, document: "52998224725", addresses: [validAddress] });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.fullName).toEqual(["fullName deve ser uma string."]);
        });

        it("recusa nome completo mais curto que o mínimo", () => {
            const validator = new UserValidator();

            expect(() =>
                validator.validateOnboarding({ fullName: "Jo", document: "52998224725", addresses: [validAddress] })
            ).toThrow(ValidationError);
        });

        it("recusa lista de endereços vazia", () => {
            const validator = new UserValidator();

            expect(() =>
                validator.validateOnboarding({
                    fullName: "João da Silva",
                    document: "52998224725",
                    addresses: [],
                })
            ).toThrow(ValidationError);
        });

        it("recusa endereço com CEP fora do formato esperado", () => {
            const validator = new UserValidator();

            expect(() =>
                validator.validateOnboarding({
                    fullName: "João da Silva",
                    document: "52998224725",
                    addresses: [{ ...validAddress, zipCode: "123" }],
                })
            ).toThrow(ValidationError);
        });

        it("recusa endereço com UF fora do padrão de duas letras maiúsculas", () => {
            const validator = new UserValidator();

            expect(() =>
                validator.validateOnboarding({
                    fullName: "João da Silva",
                    document: "52998224725",
                    addresses: [{ ...validAddress, state: "sp" }],
                })
            ).toThrow(ValidationError);
        });

        it("recusa endereço sem destinatário", () => {
            const validator = new UserValidator();
            const { recipientName, ...addressWithoutRecipient } = validAddress;

            expect(() =>
                validator.validateOnboarding({
                    fullName: "João da Silva",
                    document: "52998224725",
                    addresses: [addressWithoutRecipient],
                })
            ).toThrow(ValidationError);
        });

        it("recusa endereço sem identificação (label)", () => {
            const validator = new UserValidator();
            const { label, ...addressWithoutLabel } = validAddress;

            expect(() =>
                validator.validateOnboarding({
                    fullName: "João da Silva",
                    document: "52998224725",
                    addresses: [addressWithoutLabel],
                })
            ).toThrow(ValidationError);
        });
    });

    describe("formatError", () => {
        it("formata um ValidationError em um mapa de campo para lista de mensagens", () => {
            const validator = new UserValidator();
            let caughtError: unknown;

            try {
                validator.validateOnboarding({ fullName: "Jo", document: "52998224725", addresses: [validAddress] });
            } catch (error) {
                caughtError = error;
            }

            const formatted = validator.formatError(caughtError);

            expect(formatted.fullName).toBeDefined();
            expect(Array.isArray(formatted.fullName)).toBe(true);
        });

        it("retorna mensagem genérica quando o erro não é um ValidationError", () => {
            const validator = new UserValidator();

            const formatted = validator.formatError(new Error("erro qualquer"));

            expect(formatted).toEqual({ general: ["Erro de validação desconhecido"] });
        });
    });
});
