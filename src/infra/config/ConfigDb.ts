import { ConfigEnv } from "./ConfigEnv";

// Medido em dev (RTT ate o Supabase remoto, SELECT 1 puro, 20 amostras via
// script descartavel): p50=144ms, p90=264ms — mas com JITTER real: 1 em 20
// amostras, mesmo sem nenhuma disputa, saltou pra 1448ms (~10x o p50). Os
// defaults abaixo ja tem folga pra esse jitter ocasional, nao so pro caso
// tipico. ISSO PRECISA SER REMEDIDO NO AMBIENTE DE DEPLOY, mesma ressalva do
// REDIS_TIMEOUT_MS: app e banco na mesma regiao tendem a ter RTT de poucos
// ms e jitter proporcionalmente menor — um default daqui herdado sem remedir
// deixa os dois timeouts folgados demais pra detectar problema real rapido.
const DEFAULT_QUERY_TIMEOUT_MS = 3500;
const DEFAULT_STATEMENT_TIMEOUT_MS = 3000;

export class ConfigDb {

    static getDb():string{
        return ConfigEnv.getVariable("DIRECT_URL")
    }

    // Timeout do lado do CLIENTE (Promise.race em volta da query) — faz quem
    // chamou desistir de esperar. Fica um pouco ACIMA do statement_timeout
    // de proposito: no caso normal, e' o Postgres quem aborta a query
    // primeiro (e libera a conexao de verdade); esse aqui so cobre o caso
    // patologico onde nem a conexao TCP responde, e o statement_timeout do
    // servidor nunca chega a rodar.
    static getQueryTimeoutMs(): number {
        return Number.parseInt(ConfigEnv.getOptionalVariable("PG_QUERY_TIMEOUT_MS") ?? String(DEFAULT_QUERY_TIMEOUT_MS));
    }

    // Timeout do lado do SERVIDOR (statement_timeout do Postgres) — quem
    // efetivamente mata a query e libera a conexao do pool. O
    // Promise.race do cliente sozinho NAO faz isso, ver comentario em
    // PostgresDataAccess.ts.
    static getStatementTimeoutMs(): number {
        return Number.parseInt(
            ConfigEnv.getOptionalVariable("PG_STATEMENT_TIMEOUT_MS") ?? String(DEFAULT_STATEMENT_TIMEOUT_MS)
        );
    }

}