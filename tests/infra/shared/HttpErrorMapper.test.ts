import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpErrorMapper } from "../../../src/infra/shared/errors/HttpErrorMapper";
import { ValidationError } from "../../../src/infra/shared/errors/ValidationError";
import { UnauthorizedError } from "../../../src/domain/errors/UnauthorizedError";
import { ForbiddenError } from "../../../src/domain/errors/ForbiddenError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { OnboardingPendingError } from "../../../src/domain/errors/OnboardingPendingError";
import { IntegrationNotConnectedError } from "../../../src/domain/errors/IntegrationNotConnectedError";

describe("HttpErrorMapper", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("mapeia ValidationError para 400 com os detalhes formatados por campo", () => {
        const error = new ValidationError("Erro de validação do DTO", {
            fullName: { _errors: ["Nome completo é obrigatório."] },
            _errors: [],
        });

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(400);
        expect(body).toEqual({
            error: "Erro de validação do DTO",
            details: { fullName: ["Nome completo é obrigatório."] },
        });
    });

    it("mapeia OnboardingPendingError para 403 com a flag onboardingPending", () => {
        const error = new OnboardingPendingError("Finalize seu cadastro para continuar.");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(403);
        expect(body).toEqual({
            error: "Finalize seu cadastro para continuar.",
            details: { onboardingPending: true },
        });
    });

    it("mapeia UnauthorizedError para 401", () => {
        const error = new UnauthorizedError("Sessão inválida.");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(401);
        expect(body).toEqual({ error: "Sessão inválida." });
    });

    it("mapeia ForbiddenError para 403", () => {
        const error = new ForbiddenError("Conta desativada.");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(403);
        expect(body).toEqual({ error: "Conta desativada." });
    });

    it("mapeia NotFoundError para 404", () => {
        const error = new NotFoundError("Usuário não encontrado.");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(404);
        expect(body).toEqual({ error: "Usuário não encontrado." });
    });

    it("mapeia ConflictError para 409", () => {
        const error = new ConflictError("Onboarding já foi concluído.");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(409);
        expect(body).toEqual({ error: "Onboarding já foi concluído." });
    });

    it("mapeia BusinessRuleError para 422", () => {
        const error = new BusinessRuleError("É necessário cadastrar ao menos um endereço.");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(422);
        expect(body).toEqual({ error: "É necessário cadastrar ao menos um endereço." });
    });

    it("mapeia IntegrationNotConnectedError para 503", () => {
        const error = new IntegrationNotConnectedError("Conta do Melhor Envio ainda não conectada.");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(503);
        expect(body).toEqual({ error: "Conta do Melhor Envio ainda não conectada." });
    });

    it("mapeia qualquer erro desconhecido para 500 sem vazar a mensagem original", () => {
        const error = new Error("detalhe técnico sensível do banco de dados");

        const { status, body } = HttpErrorMapper.toHttp(error);

        expect(status).toBe(500);
        expect(body).toEqual({ error: "Erro interno do servidor" });
    });

    it("loga no servidor o erro completo quando ele cai no branch 500", () => {
        const error = new Error("detalhe técnico sensível do banco de dados");

        HttpErrorMapper.toHttp(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), error);
    });

    it("mapeia valores que não são instância de Error para 500", () => {
        const { status, body } = HttpErrorMapper.toHttp("qualquer coisa lançada sem ser um Error");

        expect(status).toBe(500);
        expect(body).toEqual({ error: "Erro interno do servidor" });
    });
});
