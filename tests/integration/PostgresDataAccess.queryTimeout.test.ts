import { afterEach, describe, expect, it } from "vitest";
import { PostgresDataAccess } from "../../src/infra/database/PostgresDataAccess";
import { TimeoutError } from "../../src/infra/shared/withTimeout";

// "Trava esperando conexão livre com o pool saturado" é UMA causa possível
// de query lenta — mas a proteção (withTimeout em volta de executeQuery) não
// distingue a causa, só o tempo decorrido. Em vez de tentar saturar de
// verdade as 10 conexões do pool através da API limitada do
// PostgresDataAccess (não expõe SQL arbitrário tipo pg_sleep), este teste
// prova o mecanismo de forma mais direta e igualmente real: contra o
// Postgres de verdade do projeto, com PG_QUERY_TIMEOUT_MS forçado bem abaixo
// do RTT real medido (~150ms, ver ConfigDb.ts), qualquer consulta real
// estoura o timeout — exatamente o que aconteceria com o pool saturado,
// só que determinístico.
describe("PostgresDataAccess — timeout do lado do cliente falha rápido, não trava esperando", () => {
    const originalTimeout = process.env.PG_QUERY_TIMEOUT_MS;

    afterEach(() => {
        if (originalTimeout === undefined) {
            delete process.env.PG_QUERY_TIMEOUT_MS;
        } else {
            process.env.PG_QUERY_TIMEOUT_MS = originalTimeout;
        }
    });

    it("uma query real que ultrapassa PG_QUERY_TIMEOUT_MS rejeita com TimeoutError, não trava", async () => {
        process.env.PG_QUERY_TIMEOUT_MS = "1"; // bem abaixo do RTT real (~150ms medido)
        const db = new PostgresDataAccess();

        const startedAt = Date.now();
        await expect(db.findMany("users", {})).rejects.toThrow(TimeoutError);
        const elapsedMs = Date.now() - startedAt;

        // Generoso o suficiente pra não ser flaky, mas bem abaixo de "travou
        // pra sempre" — prova que quem chamou nunca fica pendurado.
        expect(elapsedMs).toBeLessThan(2_000);
    });
});
