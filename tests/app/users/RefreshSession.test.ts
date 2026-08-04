import { beforeEach, describe, expect, it } from "vitest";
import { RefreshSession } from "../../../src/app/users/useCase/RefreshSession";
import { User } from "../../../src/domain/entites/User";
import { UnauthorizedError } from "../../../src/domain/errors/UnauthorizedError";
import { CachePort } from "../../../src/domain/database/CachePort";
import { AuthTokenManager } from "../../../src/infra/security/AuthTokenManager";
import { ServiceAuthToken } from "../../../src/infra/security/ServiceAuthToken";
import { DependencyInjection } from "../../../src/infra/pattern/DI";
import { FakeAuthTokenManager } from "../../doubles/FakeAuthTokenManager";
import { FakeCachePort } from "../../doubles/FakeCachePort";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const buildUseCase = () => {
    const userRepository = new InMemoryRepository<User>();
    const tokenManager = new FakeAuthTokenManager();
    const di = new DependencyInjection();
    di.addDependency(new FakeCachePort(), CachePort);
    di.addDependency(tokenManager, AuthTokenManager);
    const serviceAuthToken = new ServiceAuthToken(di);
    const useCase = new RefreshSession(serviceAuthToken, userRepository);
    let sequence = 0;
    const createId = () => `user-id-${++sequence}`;
    return { useCase, userRepository, tokenManager, serviceAuthToken, createId };
};

describe("RefreshSession", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("emite um novo access token quando o refresh token é válido e o usuário existe", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);
        context.tokenManager.setNextVerifiedPayload({ id: user.id });

        const output = await context.useCase.execute({ refreshToken: "refresh-valido" });

        expect(output.accessToken).toBe("fake-token-1");
        expect(context.tokenManager.generatedTokens).toEqual([{ payload: { id: user.id }, options: undefined }]);
    });

    it("recusa quando nenhum refresh token é informado", async () => {
        await expect(context.useCase.execute({ refreshToken: "" })).rejects.toThrow(UnauthorizedError);
        await expect(context.useCase.execute({ refreshToken: "" })).rejects.toThrow("Sessão ausente.");
    });

    it("recusa quando o refresh token está expirado", async () => {
        const expiredError = new Error("jwt expired");
        expiredError.name = "TokenExpiredError";
        context.tokenManager.failNextVerifyWith(expiredError);

        await expect(context.useCase.execute({ refreshToken: "refresh-expirado" })).rejects.toThrow(UnauthorizedError);
    });

    it("recusa quando o refresh token foi revogado (logout)", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);
        context.tokenManager.setNextVerifiedPayload({ id: user.id });
        await context.serviceAuthToken.revoke("refresh-revogado");

        await expect(context.useCase.execute({ refreshToken: "refresh-revogado" })).rejects.toThrow(UnauthorizedError);
        context.tokenManager.setNextVerifiedPayload({ id: user.id });
        await expect(context.useCase.execute({ refreshToken: "refresh-revogado" })).rejects.toThrow("Token revogado.");
    });

    it("recusa quando o refresh token aponta para um usuário que não existe mais", async () => {
        context.tokenManager.setNextVerifiedPayload({ id: "id-que-nunca-existiu" });

        await expect(context.useCase.execute({ refreshToken: "refresh-de-usuario-inexistente" })).rejects.toThrow(
            UnauthorizedError
        );
    });

    it("recusa quando o usuário do refresh token está com a conta desativada", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        user.softDelete();
        await context.userRepository.save(user);
        context.tokenManager.setNextVerifiedPayload({ id: user.id });

        await expect(context.useCase.execute({ refreshToken: "refresh-de-usuario-deletado" })).rejects.toThrow(
            "Sessão inválida."
        );
    });
});
