import { beforeEach, describe, expect, it } from "vitest";
import { AuthenticateWithGoogle } from "../../../src/app/users/useCase/AuthenticateWithGoogle";
import { User } from "../../../src/domain/entites/User";
import { ForbiddenError } from "../../../src/domain/errors/ForbiddenError";
import { UnauthorizedError } from "../../../src/domain/errors/UnauthorizedError";
import { CachePort } from "../../../src/domain/database/CachePort";
import { AuthTokenManager } from "../../../src/infra/security/AuthTokenManager";
import { ServiceAuthToken } from "../../../src/infra/security/ServiceAuthToken";
import { DependencyInjection } from "../../../src/infra/pattern/DI";
import { FakeAuthTokenManager } from "../../doubles/FakeAuthTokenManager";
import { FakeCachePort } from "../../doubles/FakeCachePort";
import { FakeOAuthProviderPort } from "../../doubles/FakeOAuthProviderPort";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const buildUseCase = () => {
    const oauthProvider = new FakeOAuthProviderPort();
    const userRepository = new InMemoryRepository<User>();
    const di = new DependencyInjection();
    di.addDependency(new FakeCachePort(), CachePort);
    di.addDependency(new FakeAuthTokenManager(), AuthTokenManager);
    const serviceAuthToken = new ServiceAuthToken(di);
    let sequence = 0;
    const createId = () => `user-id-${++sequence}`;
    const useCase = new AuthenticateWithGoogle(oauthProvider, userRepository, createId, serviceAuthToken);
    return { useCase, oauthProvider, userRepository, serviceAuthToken, createId };
};

describe("AuthenticateWithGoogle", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cria um novo usuário quando o e-mail do Google ainda não existe", async () => {
        context.oauthProvider.authorizeNextExchangeWithEmail("joao@gmail.com");

        const output = await context.useCase.execute({ code: "valid-code", redirectUri: "https://example.test/auth/google/callback" });

        expect(output.token).toBeTruthy();
        expect(output.refreshToken).toBeTruthy();
        expect(output.refreshToken).not.toBe(output.token);
        expect(output.onboardingPending).toBe(true);
        const savedUsers = await context.userRepository.findAll();
        expect(savedUsers).toHaveLength(1);
        expect(savedUsers[0].email).toBe("joao@gmail.com");
        expect(savedUsers[0].username).toBe("joao");
        expect(output.userId).toBe(savedUsers[0].id);
    });

    it("repassa o redirectUri recebido para a troca do código com o provedor OAuth", async () => {
        context.oauthProvider.authorizeNextExchangeWithEmail("joao@gmail.com");

        await context.useCase.execute({
            code: "valid-code",
            redirectUri: "https://minha-instancia.ngrok-free.app/auth/google/callback",
        });

        expect(context.oauthProvider.lastRedirectUri).toBe(
            "https://minha-instancia.ngrok-free.app/auth/google/callback"
        );
    });

    it("reaproveita o usuário existente com o mesmo e-mail", async () => {
        const existingUser = User.build(context.createId, "joao@gmail.com", "joao");
        existingUser.completeOnboarding("João da Silva", 1, "52998224725");
        await context.userRepository.save(existingUser);
        context.oauthProvider.authorizeNextExchangeWithEmail("joao@gmail.com");

        const output = await context.useCase.execute({ code: "valid-code", redirectUri: "https://example.test/auth/google/callback" });

        expect(output.onboardingPending).toBe(false);
        const savedUsers = await context.userRepository.findAll();
        expect(savedUsers).toHaveLength(1);
    });

    it("resolve colisão de username anexando sufixo numérico", async () => {
        const collidingUser = User.build(context.createId, "joao@outraempresa.com", "joao");
        await context.userRepository.save(collidingUser);
        context.oauthProvider.authorizeNextExchangeWithEmail("joao@gmail.com");

        await context.useCase.execute({ code: "valid-code", redirectUri: "https://example.test/auth/google/callback" });

        const savedUsers = await context.userRepository.findAll();
        const newUser = savedUsers.find((user) => user.email === "joao@gmail.com");
        expect(newUser?.username).toBe("joao2");
    });

    it("recusa autenticação quando o código do Google é inválido", async () => {
        context.oauthProvider.failNextCall();

        await expect(
            context.useCase.execute({ code: "invalid-code", redirectUri: "https://example.test/auth/google/callback" })
        ).rejects.toThrow(UnauthorizedError);
    });

    it("recusa autenticação de usuário com conta desativada", async () => {
        const deactivatedUser = User.build(context.createId, "joao@gmail.com", "joao");
        deactivatedUser.softDelete();
        await context.userRepository.save(deactivatedUser);
        context.oauthProvider.authorizeNextExchangeWithEmail("joao@gmail.com");

        await expect(context.useCase.execute({ code: "valid-code", redirectUri: "https://example.test/auth/google/callback" })).rejects.toThrow(ForbiddenError);
        await expect(context.useCase.execute({ code: "valid-code", redirectUri: "https://example.test/auth/google/callback" })).rejects.toThrow("Conta desativada.");
    });
});
