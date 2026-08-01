import { beforeEach, describe, expect, it } from "vitest";
import { LogoutUser } from "../../../src/app/users/useCase/LogoutUser";
import { UnauthorizedError } from "../../../src/domain/errors/UnauthorizedError";
import { CachePort } from "../../../src/domain/database/CachePort";
import { AuthTokenManager } from "../../../src/infra/security/AuthTokenManager";
import { ServiceAuthToken } from "../../../src/infra/security/ServiceAuthToken";
import { DependencyInjection } from "../../../src/infra/pattern/DI";
import { FakeAuthTokenManager } from "../../doubles/FakeAuthTokenManager";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const buildUseCase = () => {
    const cache = new FakeCachePort();
    const di = new DependencyInjection();
    di.addDependency(cache, CachePort);
    di.addDependency(new FakeAuthTokenManager(), AuthTokenManager);
    const serviceAuthToken = new ServiceAuthToken(di);
    const useCase = new LogoutUser(serviceAuthToken);
    return { useCase, cache };
};

describe("LogoutUser", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("revoga o token de sessão informado", async () => {
        await context.useCase.execute({ token: "token-valido" });

        expect(context.cache.has("blacklist:token-valido")).toBe(true);
    });

    it("recusa logout sem token informado", async () => {
        await expect(context.useCase.execute({ token: "" })).rejects.toThrow(UnauthorizedError);
        await expect(context.useCase.execute({ token: "" })).rejects.toThrow("Sessão inválida.");
    });
});
