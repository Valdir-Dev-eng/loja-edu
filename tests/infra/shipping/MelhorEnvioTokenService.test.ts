import { beforeEach, describe, expect, it } from "vitest";
import { MelhorEnvioTokenService } from "../../../src/infra/shipping/MelhorEnvioTokenService";
import { MelhorEnvioConnection } from "../../../src/domain/entites/MelhorEnvioConnection";
import { IntegrationNotConnectedError } from "../../../src/domain/errors/IntegrationNotConnectedError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const buildFetcher = (accessToken: string, refreshToken: string, expiresInSeconds: number) => {
    let callCount = 0;
    const fetcher = async () => {
        callCount += 1;
        return { accessToken, refreshToken, expiresInSeconds };
    };
    return { fetcher, getCallCount: () => callCount };
};

describe("MelhorEnvioTokenService", () => {
    let repository: InMemoryRepository<MelhorEnvioConnection>;

    beforeEach(() => {
        repository = new InMemoryRepository<MelhorEnvioConnection>();
    });

    describe("getValidAccessToken", () => {
        it("recusa quando não existe nenhuma conexão salva", async () => {
            const { fetcher } = buildFetcher("novo-token", "novo-refresh", 2592000);
            const service = new MelhorEnvioTokenService(repository, fetcher);

            await expect(service.getValidAccessToken()).rejects.toThrow(IntegrationNotConnectedError);
            await expect(service.getValidAccessToken()).rejects.toThrow(
                "Conta do Melhor Envio ainda não foi conectada."
            );
        });

        it("reutiliza o token salvo sem renovar quando ainda não expirou", async () => {
            const connection = MelhorEnvioConnection.build(
                "default",
                "token-valido",
                "refresh-valido",
                new Date(Date.now() + 60_000)
            );
            await repository.save(connection);
            const { fetcher, getCallCount } = buildFetcher("nao-deveria-usar", "x", 2592000);
            const service = new MelhorEnvioTokenService(repository, fetcher);

            const token = await service.getValidAccessToken();

            expect(token).toBe("token-valido");
            expect(getCallCount()).toBe(0);
        });

        it("renova o token quando o salvo já expirou, e persiste o novo", async () => {
            const connection = MelhorEnvioConnection.build(
                "default",
                "token-expirado",
                "refresh-antigo",
                new Date(Date.now() - 1000)
            );
            await repository.save(connection);
            const { fetcher } = buildFetcher("token-renovado", "refresh-novo", 2592000);
            const service = new MelhorEnvioTokenService(repository, fetcher);

            const token = await service.getValidAccessToken();

            expect(token).toBe("token-renovado");
            const persisted = await repository.findById("default");
            expect(persisted?.accessToken).toBe("token-renovado");
            expect(persisted?.refreshToken).toBe("refresh-novo");
            expect(persisted?.isExpired()).toBe(false);
        });
    });

    describe("isConnected", () => {
        it("devolve false quando não há conexão salva", async () => {
            const { fetcher } = buildFetcher("x", "y", 1);
            const service = new MelhorEnvioTokenService(repository, fetcher);

            expect(await service.isConnected()).toBe(false);
        });

        it("devolve true quando há conexão ativa salva", async () => {
            const connection = MelhorEnvioConnection.build("default", "token", "refresh", new Date(Date.now() + 60_000));
            await repository.save(connection);
            const { fetcher } = buildFetcher("x", "y", 1);
            const service = new MelhorEnvioTokenService(repository, fetcher);

            expect(await service.isConnected()).toBe(true);
        });
    });

    describe("saveConnection", () => {
        it("cria a conexão quando ainda não existe nenhuma", async () => {
            const { fetcher } = buildFetcher("x", "y", 1);
            const service = new MelhorEnvioTokenService(repository, fetcher);

            await service.saveConnection("access-1", "refresh-1", 2592000);

            const persisted = await repository.findById("default");
            expect(persisted?.accessToken).toBe("access-1");
            expect(persisted?.refreshToken).toBe("refresh-1");
        });

        it("atualiza a conexão existente em vez de criar uma segunda", async () => {
            const connection = MelhorEnvioConnection.build("default", "antigo", "antigo-refresh", new Date());
            await repository.save(connection);
            const { fetcher } = buildFetcher("x", "y", 1);
            const service = new MelhorEnvioTokenService(repository, fetcher);

            await service.saveConnection("access-2", "refresh-2", 2592000);

            const all = await repository.findAll();
            expect(all).toHaveLength(1);
            expect(all[0].accessToken).toBe("access-2");
        });
    });
});
