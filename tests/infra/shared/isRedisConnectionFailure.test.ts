import { ClientClosedError, ClientOfflineError, ConnectionTimeoutError, SocketClosedUnexpectedlyError } from "redis";
import { describe, expect, it } from "vitest";
import { isRedisConnectionFailure } from "../../../src/infra/shared/isRedisConnectionFailure";
import { TimeoutError } from "../../../src/infra/shared/withTimeout";

describe("isRedisConnectionFailure", () => {
    it("classifica TimeoutError (nosso, via withTimeout) como falha de conexão", () => {
        expect(isRedisConnectionFailure(new TimeoutError("rate-limit eval excedeu 1000ms"))).toBe(true);
    });

    it.each(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"])(
        "classifica erro de socket com code=%s como falha de conexão",
        (code) => {
            const error = Object.assign(new Error("socket error"), { code });
            expect(isRedisConnectionFailure(error)).toBe(true);
        }
    );

    // As classes reais do node-redis não setam `.name` no construtor (herdam
    // "Error" do protótipo) — por isso a checagem tem que ser via
    // `instanceof` com as classes de verdade, não com um objeto simulando
    // `.name`. Um teste que simulasse `{ name: "ClientOfflineError" }` teria
    // passado mesmo com o bug antigo (comparação de string) e nunca teria
    // pego o problema real.
    it.each([
        ["SocketClosedUnexpectedlyError", new SocketClosedUnexpectedlyError()],
        ["ClientClosedError", new ClientClosedError()],
        ["ClientOfflineError", new ClientOfflineError()],
        ["ConnectionTimeoutError", new ConnectionTimeoutError()],
    ])("classifica %s (instância real do node-redis) como falha de conexão", (_label, error) => {
        expect(isRedisConnectionFailure(error)).toBe(true);
    });

    it("NÃO classifica uma resposta de erro válida do Redis (bug de script, ex.: WRONGTYPE) como falha de conexão", () => {
        const error = new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
        expect(isRedisConnectionFailure(error)).toBe(false);
    });

    it("não quebra com erro sem code nem classe reconhecida, e não trata como falha de conexão", () => {
        expect(isRedisConnectionFailure(new Error("algo genérico"))).toBe(false);
        expect(isRedisConnectionFailure("string qualquer")).toBe(false);
        expect(isRedisConnectionFailure(null)).toBe(false);
    });
});
