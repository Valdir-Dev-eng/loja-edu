import { beforeEach, describe, expect, it } from "vitest";
import { RedisCircuitBreaker } from "../../../src/infra/shared/RedisCircuitBreaker";

describe("RedisCircuitBreaker", () => {
    // Instância nova a cada teste — nenhum estado de módulo é compartilhado
    // entre eles (confirmado abaixo, mas vale registrar aqui também).
    let breaker: RedisCircuitBreaker;

    beforeEach(() => {
        breaker = new RedisCircuitBreaker({ failureThreshold: 3, halfOpenIntervalMs: 50 });
    });

    it("começa fechado e deixa passar", () => {
        expect(breaker.currentState).toBe("closed");
        expect(breaker.shouldAttemptRedis()).toBe(true);
    });

    it("abre só depois de N falhas de CONEXÃO consecutivas atingirem o threshold", () => {
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        expect(breaker.currentState).toBe("closed");

        breaker.recordConnectionFailure();
        expect(breaker.currentState).toBe("open");
    });

    it("falha de COMANDO nunca move o contador nem abre o circuito", () => {
        breaker.recordCommandFailure(new Error("WRONGTYPE"));
        breaker.recordCommandFailure(new Error("WRONGTYPE"));
        breaker.recordCommandFailure(new Error("WRONGTYPE"));
        breaker.recordCommandFailure(new Error("WRONGTYPE"));
        expect(breaker.currentState).toBe("closed");
        expect(breaker.shouldAttemptRedis()).toBe(true);
    });

    it("um sucesso no meio zera o contador de falhas de conexão", () => {
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        breaker.recordSuccess();
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        expect(breaker.currentState).toBe("closed"); // só 2 seguidas depois do reset, threshold é 3
    });

    it("aberto: bypassa (shouldAttemptRedis=false) antes da janela de meia-abertura passar", () => {
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        expect(breaker.currentState).toBe("open");
        expect(breaker.shouldAttemptRedis()).toBe(false);
    });

    it("aberto: depois da janela passar, deixa UMA sonda tentar e volta a bypassar as demais", async () => {
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(breaker.shouldAttemptRedis()).toBe(true); // a sonda
        expect(breaker.shouldAttemptRedis()).toBe(false); // qualquer outra, mesma janela
        expect(breaker.shouldAttemptRedis()).toBe(false);
    });

    it("recordSuccess() depois da sonda fecha o circuito de novo", async () => {
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(breaker.shouldAttemptRedis()).toBe(true);
        breaker.recordSuccess();
        expect(breaker.currentState).toBe("closed");
        expect(breaker.shouldAttemptRedis()).toBe(true);
    });

    it("sonda que falha libera a PRÓXIMA sonda (não trava em half-open reivindicado para sempre)", async () => {
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(breaker.shouldAttemptRedis()).toBe(true); // primeira sonda, reivindicada
        breaker.recordConnectionFailure(); // ela falhou
        expect(breaker.currentState).toBe("open"); // continua aberto

        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(breaker.shouldAttemptRedis()).toBe(true); // nova sonda, não ficou travado
    });

    // N chamadas "simultâneas" (mesmo tick de microtask, via Promise.all) no
    // instante em que a sonda libera — exatamente UMA pode reivindicar. Isso
    // só é garantido porque shouldAttemptRedis() não tem NENHUM await entre
    // ler halfOpenClaimed e escrever — ver o passo de desliga-e-confirma-
    // vermelho no relatório final, que insere um await ali de propósito e
    // prova que múltiplas reivindicações passam a vazar.
    it("meia-abertura é segura a concorrência: N chamadas simultâneas, exatamente 1 reivindica a sonda", async () => {
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        breaker.recordConnectionFailure();
        await new Promise((resolve) => setTimeout(resolve, 60));

        const N = 50;
        const results = await Promise.all(
            Array.from({ length: N }, () => Promise.resolve().then(() => breaker.shouldAttemptRedis()))
        );

        const claimedCount = results.filter(Boolean).length;
        expect(claimedCount).toBe(1);
    });
});
