import { beforeEach, describe, expect, it } from "vitest";
import { ServiceAuthToken } from "../../../src/infra/security/ServiceAuthToken";
import { UnauthorizedError } from "../../../src/domain/errors/UnauthorizedError";
import { CachePort } from "../../../src/domain/database/CachePort";
import { AuthTokenManager } from "../../../src/infra/security/AuthTokenManager";
import { DependencyInjection } from "../../../src/infra/pattern/DI";
import { FakeAuthTokenManager } from "../../doubles/FakeAuthTokenManager";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const buildService = () => {
    const cache = new FakeCachePort();
    const tokenManager = new FakeAuthTokenManager();
    const di = new DependencyInjection();
    di.addDependency(cache, CachePort);
    di.addDependency(tokenManager, AuthTokenManager);
    const service = new ServiceAuthToken(di);
    return { service, cache, tokenManager };
};

describe("ServiceAuthToken", () => {
    let context: ReturnType<typeof buildService>;

    beforeEach(() => {
        context = buildService();
    });

    describe("generateToken", () => {
        it("gera o token de sessão delegando ao AuthTokenManager", () => {
            const token = context.service.generateToken({ id: "user-id-1" });

            expect(token).toBe("fake-token-1");
            expect(context.tokenManager.generatedTokens).toEqual([{ payload: { id: "user-id-1" }, options: undefined }]);
        });
    });

    describe("generateRefreshToken", () => {
        it("gera o token de refresh delegando ao AuthTokenManager", () => {
            const token = context.service.generateRefreshToken({ id: "user-id-1" });

            expect(token).toBe("fake-refresh-token-1");
            expect(context.tokenManager.generatedRefreshTokens).toEqual([
                { payload: { id: "user-id-1" }, options: undefined },
            ]);
        });
    });

    describe("generateTimeSetToken", () => {
        it("gera o token com prazo customizado delegando ao AuthTokenManager", () => {
            const token = context.service.generateTimeSetToken({ email: "joao@gmail.com" }, "1h");

            expect(token).toBe("fake-time-set-token-1");
            expect(context.tokenManager.generatedTimeSetTokens).toEqual([
                { payload: { email: "joao@gmail.com" }, expiresIn: "1h" },
            ]);
        });
    });

    describe("verifySessionToken", () => {
        it("retorna o payload decodificado quando o token não está revogado", async () => {
            context.tokenManager.setNextVerifiedPayload({ id: "user-id-1" });

            const payload = await context.service.verifySessionToken<{ id: string }>("token-valido");

            expect(payload).toEqual({ id: "user-id-1" });
        });

        it("recusa token de sessão revogado", async () => {
            await context.cache.set("blacklist:token-revogado", "revoked", 3600);

            await expect(context.service.verifySessionToken("token-revogado")).rejects.toThrow(UnauthorizedError);
            await expect(context.service.verifySessionToken("token-revogado")).rejects.toThrow("Token revogado.");
        });

        it("recusa token de sessão malformado com mensagem de sessão inválida", async () => {
            context.tokenManager.failNextVerifyWith(new Error("jwt malformed"));

            await expect(context.service.verifySessionToken("token-malformado")).rejects.toThrow(UnauthorizedError);
            context.tokenManager.failNextVerifyWith(new Error("jwt malformed"));
            await expect(context.service.verifySessionToken("token-malformado")).rejects.toThrow(
                "Sessão inválida. Faça login novamente."
            );
        });

        it("recusa token de sessão expirado com mensagem de sessão expirada", async () => {
            const expiredError = new Error("jwt expired");
            expiredError.name = "TokenExpiredError";
            context.tokenManager.failNextVerifyWith(expiredError);

            await expect(context.service.verifySessionToken("token-expirado")).rejects.toThrow(UnauthorizedError);
            const expiredErrorAgain = new Error("jwt expired");
            expiredErrorAgain.name = "TokenExpiredError";
            context.tokenManager.failNextVerifyWith(expiredErrorAgain);
            await expect(context.service.verifySessionToken("token-expirado")).rejects.toThrow(
                "Sessão expirada. Faça login novamente."
            );
        });
    });

    describe("verifyRefreshToken", () => {
        it("retorna o payload decodificado quando o refresh token não está revogado", async () => {
            context.tokenManager.setNextVerifiedPayload({ id: "user-id-1" });

            const payload = await context.service.verifyRefreshToken<{ id: string }>("refresh-valido");

            expect(payload).toEqual({ id: "user-id-1" });
        });

        it("recusa refresh token revogado", async () => {
            await context.cache.set("blacklist:refresh-revogado", "revoked", 3600);

            await expect(context.service.verifyRefreshToken("refresh-revogado")).rejects.toThrow(UnauthorizedError);
            await expect(context.service.verifyRefreshToken("refresh-revogado")).rejects.toThrow("Token revogado.");
        });

        it("recusa refresh token inválido com mensagem de sessão inválida", async () => {
            context.tokenManager.failNextVerifyWith(new Error("invalid signature"));

            await expect(context.service.verifyRefreshToken("refresh-invalido")).rejects.toThrow(UnauthorizedError);
            context.tokenManager.failNextVerifyWith(new Error("invalid signature"));
            await expect(context.service.verifyRefreshToken("refresh-invalido")).rejects.toThrow(
                "Sessão inválida. Faça login novamente."
            );
        });
    });

    describe("verifyTimeSetToken", () => {
        it("retorna o payload decodificado quando o token de prazo customizado não está revogado", async () => {
            context.tokenManager.setNextVerifiedPayload({ email: "joao@gmail.com" });

            const payload = await context.service.verifyTimeSetToken<{ email: string }>("time-set-valido");

            expect(payload).toEqual({ email: "joao@gmail.com" });
        });

        it("recusa token de prazo customizado expirado com mensagem de sessão expirada", async () => {
            const expiredError = new Error("jwt expired");
            expiredError.name = "TokenExpiredError";
            context.tokenManager.failNextVerifyWith(expiredError);

            await expect(context.service.verifyTimeSetToken("time-set-expirado")).rejects.toThrow(UnauthorizedError);
            const expiredErrorAgain = new Error("jwt expired");
            expiredErrorAgain.name = "TokenExpiredError";
            context.tokenManager.failNextVerifyWith(expiredErrorAgain);
            await expect(context.service.verifyTimeSetToken("time-set-expirado")).rejects.toThrow(
                "Sessão expirada. Faça login novamente."
            );
        });
    });

    describe("revoke", () => {
        it("marca o token como revogado no cache com o ttl informado", async () => {
            await context.service.revoke("token-a-revogar", 120);

            expect(context.cache.has("blacklist:token-a-revogar")).toBe(true);
        });

        it("usa o ttl padrão de uma hora quando nenhum é informado", async () => {
            await context.service.revoke("token-a-revogar");

            expect(context.cache.has("blacklist:token-a-revogar")).toBe(true);
        });
    });

    describe("decode", () => {
        it("retorna o payload decodificado sem checar revogação", () => {
            context.tokenManager.setNextDecodedPayload({ id: "user-id-1" });

            const payload = context.service.decode<{ id: string }>("qualquer-token");

            expect(payload).toEqual({ id: "user-id-1" });
        });

        it("retorna null quando o token não pode ser decodificado", () => {
            const payload = context.service.decode("token-invalido");

            expect(payload).toBeNull();
        });
    });
});
