import { describe, expect, it } from "vitest";
import { SingleFlight } from "../../../src/infra/cache/SingleFlight";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("SingleFlight", () => {
    it("agrupa chamadas concorrentes com a mesma chave: só executa fn uma vez", async () => {
        const singleFlight = new SingleFlight();
        let callCount = 0;
        const fn = async () => {
            callCount++;
            await wait(20);
            return "resultado";
        };

        const results = await Promise.all([
            singleFlight.run("key", fn),
            singleFlight.run("key", fn),
            singleFlight.run("key", fn),
        ]);

        expect(callCount).toBe(1);
        expect(results).toEqual(["resultado", "resultado", "resultado"]);
    });

    it("não agrupa chamadas com chaves diferentes: fn roda uma vez por chave", async () => {
        const singleFlight = new SingleFlight();
        let callCount = 0;
        const fn = async () => {
            const mine = ++callCount;
            await wait(10);
            return mine;
        };

        const [a, b] = await Promise.all([singleFlight.run("key-a", fn), singleFlight.run("key-b", fn)]);

        expect(callCount).toBe(2);
        expect(a).not.toBe(b);
    });

    it("depois que a primeira chamada termina, uma nova chamada com a mesma chave executa fn de novo (não fica presa em cache permanente)", async () => {
        const singleFlight = new SingleFlight();
        let callCount = 0;
        const fn = async () => {
            callCount++;
            return callCount;
        };

        const first = await singleFlight.run("key", fn);
        const second = await singleFlight.run("key", fn);

        expect(callCount).toBe(2);
        expect(first).toBe(1);
        expect(second).toBe(2);
    });

    it("se fn falhar, todo mundo que estava esperando recebe o mesmo erro, e a chave libera para uma nova tentativa em seguida", async () => {
        const singleFlight = new SingleFlight();
        let attempt = 0;
        const fn = async () => {
            attempt++;
            if (attempt === 1) {
                throw new Error("falha simulada na primeira tentativa");
            }
            return "sucesso na segunda tentativa";
        };

        const failing = Promise.allSettled([singleFlight.run("key", fn), singleFlight.run("key", fn)]);
        const [first, second] = await failing;

        expect(first.status).toBe("rejected");
        expect(second.status).toBe("rejected");
        expect(attempt).toBe(1);

        const retried = await singleFlight.run("key", fn);
        expect(retried).toBe("sucesso na segunda tentativa");
        expect(attempt).toBe(2);
    });
});
