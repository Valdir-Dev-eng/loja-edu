import { beforeEach, describe, expect, it } from "vitest";
import { GetAuthenticatedUser } from "../../../src/app/users/useCase/GetAuthenticatedUser";
import { USER_CACHE_TTL_SECONDS, userByIdCacheKey } from "../../../src/app/users/UserCacheKeys";
import { User } from "../../../src/domain/entites/User";
import { UnauthorizedError } from "../../../src/domain/errors/UnauthorizedError";
import { CachePort } from "../../../src/domain/database/CachePort";
import { AuthTokenManager } from "../../../src/infra/security/AuthTokenManager";
import { ServiceAuthToken } from "../../../src/infra/security/ServiceAuthToken";
import { DependencyInjection } from "../../../src/infra/pattern/DI";
import { FakeAuthTokenManager } from "../../doubles/FakeAuthTokenManager";
import { FakeCachePort } from "../../doubles/FakeCachePort";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

class DecodingFakeAuthTokenManager extends FakeAuthTokenManager {
    constructor(private readonly userId: string) {
        super();
    }

    async verifyToken<T extends object>(token: string): Promise<T> {
        return { id: this.userId } as unknown as T;
    }
}

const buildUseCase = (userId: string) => {
    const userRepository = new InMemoryRepository<User>();
    const cache = new FakeCachePort();
    const di = new DependencyInjection();
    di.addDependency(cache, CachePort);
    di.addDependency(new DecodingFakeAuthTokenManager(userId), AuthTokenManager);
    const serviceAuthToken = new ServiceAuthToken(di);
    const useCase = new GetAuthenticatedUser(serviceAuthToken, userRepository, cache);
    return { useCase, userRepository, cache };
};

const createId = () => "user-id-1";

describe("GetAuthenticatedUser", () => {
    it("retorna os dados do usuário autenticado a partir de um token válido", async () => {
        const { useCase, userRepository } = buildUseCase("user-id-1");
        const user = User.build(createId, "joao@gmail.com", "joao");
        await userRepository.save(user);

        const output = await useCase.execute({ token: "token-valido" });

        expect(output.id).toBe("user-id-1");
        expect(output.email).toBe("joao@gmail.com");
        expect(output.onboardingCompleted).toBe(false);
    });

    it("recusa quando nenhum token é informado", async () => {
        const { useCase } = buildUseCase("user-id-1");

        await expect(useCase.execute({ token: "" })).rejects.toThrow(UnauthorizedError);
        await expect(useCase.execute({ token: "" })).rejects.toThrow("Sessão ausente.");
    });

    it("recusa quando o usuário do token não existe mais", async () => {
        const { useCase } = buildUseCase("user-id-inexistente");

        await expect(useCase.execute({ token: "token-valido" })).rejects.toThrow(UnauthorizedError);
        await expect(useCase.execute({ token: "token-valido" })).rejects.toThrow("Sessão inválida.");
    });

    it("recusa quando o usuário do token foi desativado", async () => {
        const { useCase, userRepository } = buildUseCase("user-id-1");
        const user = User.build(createId, "joao@gmail.com", "joao");
        user.softDelete();
        await userRepository.save(user);

        await expect(useCase.execute({ token: "token-valido" })).rejects.toThrow(UnauthorizedError);
        await expect(useCase.execute({ token: "token-valido" })).rejects.toThrow("Sessão inválida.");
    });

    describe("cache-aside", () => {
        it("grava no cache com o TTL de segurança quando o cache está vazio", async () => {
            const { useCase, userRepository, cache } = buildUseCase("user-id-1");
            const user = User.build(createId, "joao@gmail.com", "joao");
            await userRepository.save(user);

            await useCase.execute({ token: "token-valido" });

            const cacheKey = userByIdCacheKey("user-id-1");
            const cached = await cache.get(cacheKey);
            expect(cached).not.toBeNull();
            expect(cache.getTtl(cacheKey)).toBe(USER_CACHE_TTL_SECONDS);
        });

        it("devolve o conteúdo do cache sem tocar o repositório quando o cache já está populado", async () => {
            const { useCase, cache } = buildUseCase("user-id-1");
            const cachedOutput = {
                id: "user-id-1",
                email: "cache@gmail.com",
                username: "cache",
                fullName: null,
                onboardingCompleted: false,
                isAdmin: false,
            };
            await cache.set(userByIdCacheKey("user-id-1"), JSON.stringify(cachedOutput), USER_CACHE_TTL_SECONDS);

            const output = await useCase.execute({ token: "token-valido" });

            expect(output).toEqual(cachedOutput);
        });
    });
});
