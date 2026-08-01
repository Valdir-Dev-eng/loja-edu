import { describe, expect, it } from "vitest";
import { Address } from "../../../src/domain/entites/Address";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const createId = () => "address-id-1";

const buildValidAddress = (overrides: Partial<{
    recipientName: string;
    zipCode: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    label: string;
}> = {}) =>
    Address.build(
        createId,
        "user-id-1",
        overrides.recipientName ?? "João da Silva",
        overrides.zipCode ?? "01310100",
        overrides.street ?? "Avenida Paulista",
        overrides.number ?? "1000",
        "complement" in overrides ? overrides.complement ?? null : "Apto 12",
        overrides.neighborhood ?? "Bela Vista",
        overrides.city ?? "São Paulo",
        overrides.state ?? "SP",
        overrides.label ?? "Casa"
    );

describe("Address", () => {
    describe("build", () => {
        it("cria o endereço com todos os campos informados", () => {
            const address = buildValidAddress();

            expect(address.id).toBe("address-id-1");
            expect(address.userId).toBe("user-id-1");
            expect(address.zipCode).toBe("01310100");
            expect(address.state).toBe("SP");
            expect(address.label).toBe("Casa");
        });

        it("aceita endereço sem complemento", () => {
            const address = buildValidAddress({ complement: null });

            expect(address.complement).toBeNull();
        });

        it("recusa CEP mais curto que 8 dígitos", () => {
            expect(() => buildValidAddress({ zipCode: "123" })).toThrow(BusinessRuleError);
            expect(() => buildValidAddress({ zipCode: "123" })).toThrow("CEP inválido.");
        });

        it("recusa CEP mais longo que 8 dígitos", () => {
            expect(() => buildValidAddress({ zipCode: "013101000" })).toThrow(BusinessRuleError);
            expect(() => buildValidAddress({ zipCode: "013101000" })).toThrow("CEP inválido.");
        });

        it("recusa CEP com caracteres não numéricos", () => {
            expect(() => buildValidAddress({ zipCode: "0131010A" })).toThrow(BusinessRuleError);
            expect(() => buildValidAddress({ zipCode: "0131010A" })).toThrow("CEP inválido.");
        });

        it("recusa UF em letras minúsculas", () => {
            expect(() => buildValidAddress({ state: "sp" })).toThrow(BusinessRuleError);
            expect(() => buildValidAddress({ state: "sp" })).toThrow("UF inválida.");
        });

        it("recusa UF com mais de duas letras", () => {
            expect(() => buildValidAddress({ state: "SPA" })).toThrow(BusinessRuleError);
            expect(() => buildValidAddress({ state: "SPA" })).toThrow("UF inválida.");
        });

        it("recusa destinatário vazio", () => {
            expect(() => buildValidAddress({ recipientName: "   " })).toThrow(BusinessRuleError);
            expect(() => buildValidAddress({ recipientName: "   " })).toThrow(
                "Nome do destinatário é obrigatório."
            );
        });

        it("recusa identificação (label) vazia", () => {
            expect(() => buildValidAddress({ label: "   " })).toThrow(BusinessRuleError);
            expect(() => buildValidAddress({ label: "   " })).toThrow(
                "Identificação do endereço é obrigatória."
            );
        });
    });

    describe("softDelete", () => {
        it("marca o endereço como deletado", () => {
            const address = buildValidAddress();

            address.softDelete();

            expect(address.deleted_at).not.toBeNull();
        });

        it("recusa deletar um endereço já deletado", () => {
            const address = buildValidAddress();
            address.softDelete();

            expect(() => address.softDelete()).toThrow(ConflictError);
            expect(() => address.softDelete()).toThrow("Endereço já está deletado.");
        });
    });
});
