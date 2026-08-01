import { describe, expect, it } from "vitest";
import { SirvTokenService } from "../../../src/infra/image/SirvTokenService";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const buildFetcher = (token: string, expiresIn: number) => {
    let callCount = 0;
    const fetchToken = async () => {
        callCount += 1;
        return { token, expiresIn };
    };
    return { fetchToken, getCallCount: () => callCount };
};

describe("SirvTokenService", () => {
    it("busca um token novo e guarda em cache quando não há nada em cache", async () => {
        const cache = new FakeCachePort();
        const { fetchToken, getCallCount } = buildFetcher("token-1", 1200);
        const service = new SirvTokenService(cache, fetchToken);

        const token = await service.getToken();

        expect(token).toBe("token-1");
        expect(getCallCount()).toBe(1);
        expect(await cache.get("sirv:token")).toBe("token-1");
    });

    it("reutiliza o token em cache sem chamar o Sirv de novo", async () => {
        const cache = new FakeCachePort();
        await cache.set("sirv:token", "token-cacheado", 1200);
        const { fetchToken, getCallCount } = buildFetcher("token-novo", 1200);
        const service = new SirvTokenService(cache, fetchToken);

        const token = await service.getToken();

        expect(token).toBe("token-cacheado");
        expect(getCallCount()).toBe(0);
    });

    it("renova o token quando o cache expira, buscando um novo no Sirv", async () => {
        const cache = new FakeCachePort();
        const { fetchToken, getCallCount } = buildFetcher("token-renovado", 1200);
        const service = new SirvTokenService(cache, fetchToken);
        await cache.del("sirv:token");

        const token = await service.getToken();

        expect(token).toBe("token-renovado");
        expect(getCallCount()).toBe(1);
    });

    it("nunca deixa o TTL do cache ficar zero ou negativo quando expiresIn é menor que a margem de segurança", async () => {
        const cache = new FakeCachePort();
        const { fetchToken } = buildFetcher("token-curto", 30);
        const service = new SirvTokenService(cache, fetchToken);

        await service.getToken();

        expect(cache.getTtl("sirv:token")).toBe(1);
    });

    it("guarda o token em cache com TTL abaixo do tempo real de expiração, como margem de segurança", async () => {
        const cache = new FakeCachePort();
        const { fetchToken } = buildFetcher("token-1", 1200);
        const service = new SirvTokenService(cache, fetchToken);

        await service.getToken();

        expect(cache.getTtl("sirv:token")).toBe(1140);
    });
});
