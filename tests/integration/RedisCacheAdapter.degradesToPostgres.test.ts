import { afterEach, describe, expect, it, vi } from "vitest";
import { GetAuthenticatedUser } from "../../src/app/users/useCase/GetAuthenticatedUser";
import { CachePort } from "../../src/domain/database/CachePort";
import { User } from "../../src/domain/entites/User";
import { DependencyInjection } from "../../src/infra/pattern/DI";
import { UserRepository } from "../../src/infra/repository/UserRepository";
import { AuthTokenManager } from "../../src/infra/security/AuthTokenManager";
import { ServiceAuthToken } from "../../src/infra/security/ServiceAuthToken";
import { RedisCacheAdapter } from "../../src/infra/database/RedisCacheAdapter";
import { RedisCircuitBreaker } from "../../src/infra/shared/RedisCircuitBreaker";
import { FakeAuthTokenManager } from "../doubles/FakeAuthTokenManager";
import { TestWithMemoryDataAcess } from "../doubles/TestWithMemoryDataAcess";

class DecodingFakeAuthTokenManager extends FakeAuthTokenManager {
    constructor(private readonly userId: string) {
        super();
    }
    async verifyToken<T extends object>(): Promise<T> {
        return { id: this.userId } as unknown as T;
    }
}

const createId = () => "user-cache-degrade";

describe("RedisCacheAdapter — degrada pro Postgres quando o circuito está aberto (adapter real, não Fake)", () => {
    let cache: RedisCacheAdapter;

    afterEach(() => {
        // destroy() sincrono: o teste nao precisa (nem quer) esperar handshake
        // de rede pra derrubar o client no fim.
        (cache as unknown as { client: { destroy(): void } })?.client.destroy();
    });

    it("breaker aberto -> get() retorna null sem lançar -> GetAuthenticatedUser ainda funciona, lendo do banco", async () => {
        // Breaker forçado aberto via API pública (mesma tática do teste de
        // concorrência da meia-abertura) — não depende de rede, nem de saber
        // se o Redis real do projeto está de pé ou não nesse instante.
        const breaker = new RedisCircuitBreaker({ failureThreshold: 1, halfOpenIntervalMs: 60_000 });
        breaker.recordConnectionFailure();
        expect(breaker.currentState).toBe("open");

        cache = new RedisCacheAdapter(breaker);
        const getSpy = vi.spyOn(cache["client"], "get");

        const db = new TestWithMemoryDataAcess(3);
        const userRepository = new UserRepository(db);
        const user = User.build(createId, "cache-degrade@gmail.com", "cachedegrade");
        await userRepository.save(user);

        const di = new DependencyInjection();
        di.addDependency(cache, CachePort);
        di.addDependency(new DecodingFakeAuthTokenManager(user.id), AuthTokenManager);
        const serviceAuthToken = new ServiceAuthToken(di);
        const useCase = new GetAuthenticatedUser(serviceAuthToken, userRepository, cache);

        const cacheGetResult = await cache.get("qualquer-chave");
        expect(cacheGetResult).toBeNull();
        // A prova de que foi bypass, e não uma resposta legítima "chave não
        // existe" vinda de um Redis de verdade: o client nem chegou a ser
        // chamado.
        expect(getSpy).not.toHaveBeenCalled();

        const output = await useCase.execute({ token: "token-valido" });

        expect(output.id).toBe(user.id);
        expect(output.email).toBe("cache-degrade@gmail.com");
        expect(db.callsTo("users", "findOne")).toBe(1);
    });
});
