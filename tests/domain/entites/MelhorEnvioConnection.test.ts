import { describe, expect, it } from "vitest";
import { MelhorEnvioConnection } from "../../../src/domain/entites/MelhorEnvioConnection";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";

const futureDate = () => new Date(Date.now() + 60_000);
const pastDate = () => new Date(Date.now() - 60_000);

describe("MelhorEnvioConnection", () => {
    describe("build", () => {
        it("cria a conexão com os tokens e a expiração informados", () => {
            const expiresAt = futureDate();

            const connection = MelhorEnvioConnection.build("default", "access-1", "refresh-1", expiresAt);

            expect(connection.id).toBe("default");
            expect(connection.accessToken).toBe("access-1");
            expect(connection.refreshToken).toBe("refresh-1");
            expect(connection.expiresAt).toBe(expiresAt);
        });

        it("recusa access token vazio", () => {
            expect(() => MelhorEnvioConnection.build("default", "", "refresh-1", futureDate())).toThrow(
                BusinessRuleError
            );
        });

        it("recusa refresh token vazio", () => {
            expect(() => MelhorEnvioConnection.build("default", "access-1", "", futureDate())).toThrow(
                "Tokens de conexão do Melhor Envio inválidos."
            );
        });
    });

    describe("isExpired", () => {
        it("não está expirada quando expiresAt está no futuro", () => {
            const connection = MelhorEnvioConnection.build("default", "access-1", "refresh-1", futureDate());

            expect(connection.isExpired()).toBe(false);
        });

        it("está expirada quando expiresAt já passou", () => {
            const connection = MelhorEnvioConnection.build("default", "access-1", "refresh-1", pastDate());

            expect(connection.isExpired()).toBe(true);
        });
    });

    describe("updateTokens", () => {
        it("atualiza os tokens e a expiração após renovar", () => {
            const connection = MelhorEnvioConnection.build("default", "access-1", "refresh-1", pastDate());
            const newExpiresAt = futureDate();

            connection.updateTokens("access-2", "refresh-2", newExpiresAt);

            expect(connection.accessToken).toBe("access-2");
            expect(connection.refreshToken).toBe("refresh-2");
            expect(connection.expiresAt).toBe(newExpiresAt);
            expect(connection.isExpired()).toBe(false);
        });

        it("recusa atualizar para um access token vazio", () => {
            const connection = MelhorEnvioConnection.build("default", "access-1", "refresh-1", futureDate());

            expect(() => connection.updateTokens("", "refresh-2", futureDate())).toThrow(BusinessRuleError);
        });
    });

    describe("softDelete", () => {
        it("marca a conexão como desconectada", () => {
            const connection = MelhorEnvioConnection.build("default", "access-1", "refresh-1", futureDate());

            connection.softDelete();

            expect(connection.deleted_at).not.toBeNull();
        });

        it("recusa desconectar uma conexão já desconectada", () => {
            const connection = MelhorEnvioConnection.build("default", "access-1", "refresh-1", futureDate());
            connection.softDelete();

            expect(() => connection.softDelete()).toThrow(ConflictError);
            expect(() => connection.softDelete()).toThrow(
                "Conexão com o Melhor Envio já está desconectada."
            );
        });
    });
});
