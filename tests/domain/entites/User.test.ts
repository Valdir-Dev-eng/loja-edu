import { describe, expect, it } from "vitest";
import { User, UserRole } from "../../../src/domain/entites/User";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const createId = () => "user-id-1";

describe("User", () => {
    describe("build", () => {
        it("cria o usuário com onboarding pendente e nome completo nulo", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            expect(user.id).toBe("user-id-1");
            expect(user.email).toBe("joao@gmail.com");
            expect(user.username).toBe("joao");
            expect(user.fullName).toBeNull();
            expect(user.onboardingCompleted).toBe(false);
        });

        it("nasce sem documento vinculado", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            expect(user.document).toBeNull();
        });

        it("nasce com o papel CUSTOMER", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            expect(user.role).toBe(UserRole.CUSTOMER);
            expect(user.isAdmin()).toBe(false);
        });

        it("recusa e-mail inválido sem @", () => {
            expect(() => User.build(createId, "invalido", "joao")).toThrow(BusinessRuleError);
            expect(() => User.build(createId, "invalido", "joao")).toThrow("E-mail inválido.");
        });

        it("recusa e-mail mais curto que o mínimo aceitável", () => {
            expect(() => User.build(createId, "a@b", "joao")).toThrow(BusinessRuleError);
            expect(() => User.build(createId, "a@b", "joao")).toThrow("E-mail inválido.");
        });

        it("aceita e-mail no limite mínimo de tamanho", () => {
            const user = User.build(createId, "a@b.c", "joao");

            expect(user.email).toBe("a@b.c");
        });

        it("recusa username vazio", () => {
            expect(() => User.build(createId, "joao@gmail.com", "  ")).toThrow(BusinessRuleError);
            expect(() => User.build(createId, "joao@gmail.com", "  ")).toThrow("Nome de usuário inválido.");
        });
    });

    describe("sanitizeEmailLocalPart", () => {
        it("gera username a partir da parte antes do @, removendo caracteres não alfanuméricos", () => {
            expect(User.sanitizeEmailLocalPart("joao.silva123@gmail.com")).toBe("joaosilva123");
        });

        it("remove acentos da parte local do e-mail", () => {
            expect(User.sanitizeEmailLocalPart("joão@gmail.com")).toBe("joao");
        });

        it("converte letras maiúsculas para minúsculas", () => {
            expect(User.sanitizeEmailLocalPart("JoaoSilva@gmail.com")).toBe("joaosilva");
        });

        it("ignora o domínio do e-mail, usando apenas a parte local", () => {
            expect(User.sanitizeEmailLocalPart("joao@empresa.com.br")).toBe("joao");
        });

        it("usa 'usuario' como fallback quando a parte local não sobra nenhum caractere válido", () => {
            expect(User.sanitizeEmailLocalPart("...@gmail.com")).toBe("usuario");
        });
    });

    describe("buildUsernameCandidate", () => {
        it("retorna o próprio base na primeira tentativa", () => {
            expect(User.buildUsernameCandidate("joao", 0)).toBe("joao");
        });

        it("anexa o sufixo 2 na primeira colisão", () => {
            expect(User.buildUsernameCandidate("joao", 1)).toBe("joao2");
        });

        it("anexa o sufixo 3 na segunda colisão consecutiva", () => {
            expect(User.buildUsernameCandidate("joao", 2)).toBe("joao3");
        });
    });

    describe("completeOnboarding", () => {
        it("conclui o onboarding salvando o nome completo", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            user.completeOnboarding("João da Silva", 1, "52998224725");

            expect(user.fullName).toBe("João da Silva");
            expect(user.onboardingCompleted).toBe(true);
        });

        it("remove espaços nas bordas do nome completo ao concluir onboarding", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            user.completeOnboarding("  João da Silva  ", 1, "52998224725");

            expect(user.fullName).toBe("João da Silva");
        });

        it("aceita concluir onboarding com mais de um endereço cadastrado", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            user.completeOnboarding("João da Silva", 3, "52998224725");

            expect(user.onboardingCompleted).toBe(true);
        });

        it("recusa concluir onboarding sem nome completo", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            expect(() => user.completeOnboarding("   ", 1, "52998224725")).toThrow(BusinessRuleError);
            expect(() => user.completeOnboarding("   ", 1, "52998224725")).toThrow("Nome completo é obrigatório.");
        });

        it("recusa concluir onboarding sem nenhum endereço", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            expect(() => user.completeOnboarding("João da Silva", 0, "52998224725")).toThrow(BusinessRuleError);
            expect(() => user.completeOnboarding("João da Silva", 0, "52998224725")).toThrow(
                "É necessário cadastrar ao menos um endereço."
            );
        });

        it("recusa concluir onboarding já concluído", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");
            user.completeOnboarding("João da Silva", 1, "52998224725");

            expect(() => user.completeOnboarding("João da Silva", 1, "52998224725")).toThrow(ConflictError);
            expect(() => user.completeOnboarding("João da Silva", 1, "52998224725")).toThrow(
                "Onboarding já foi concluído."
            );
        });

        it("salva apenas os dígitos do documento, removendo pontuação de CPF", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            user.completeOnboarding("João da Silva", 1, "529.982.247-25");

            expect(user.document).toBe("52998224725");
        });

        it("aceita documento de 14 dígitos (CNPJ)", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            user.completeOnboarding("João da Silva", 1, "11.222.333/0001-81");

            expect(user.document).toBe("11222333000181");
        });

        it("recusa documento com quantidade de dígitos inválida", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            expect(() => user.completeOnboarding("João da Silva", 1, "123")).toThrow(BusinessRuleError);
            expect(() => user.completeOnboarding("João da Silva", 1, "123")).toThrow("CPF ou CNPJ inválido.");
        });
    });

    describe("promoteToAdmin", () => {
        it("promove o usuário a administrador", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            user.promoteToAdmin();

            expect(user.role).toBe(UserRole.ADMIN);
            expect(user.isAdmin()).toBe(true);
        });

        it("recusa promover um usuário que já é administrador", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");
            user.promoteToAdmin();

            expect(() => user.promoteToAdmin()).toThrow(ConflictError);
            expect(() => user.promoteToAdmin()).toThrow("Usuário já é administrador.");
        });
    });

    describe("softDelete", () => {
        it("marca o usuário como deletado", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            user.softDelete();

            expect(user.deleted_at).not.toBeNull();
        });

        it("recusa deletar um usuário já deletado", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");
            user.softDelete();

            expect(() => user.softDelete()).toThrow(ConflictError);
            expect(() => user.softDelete()).toThrow("Usuário já está deletado.");
        });
    });

    describe("reactivate", () => {
        it("remove a marca de deletado de um usuário soft-deletado", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");
            user.softDelete();

            user.reactivate();

            expect(user.deleted_at).toBeNull();
        });

        it("recusa reativar um usuário que já está ativo", () => {
            const user = User.build(createId, "joao@gmail.com", "joao");

            expect(() => user.reactivate()).toThrow(ConflictError);
            expect(() => user.reactivate()).toThrow("Usuário já está ativo.");
        });
    });
});
