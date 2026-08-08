import {
    ClientClosedError,
    ClientOfflineError,
    ConnectionTimeoutError,
    SocketClosedUnexpectedlyError,
} from "redis";
import { TimeoutError } from "./withTimeout";

const CONNECTION_ERROR_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"]);

// As classes de erro do node-redis (errors.js) NAO setam `this.name` no
// construtor — todas herdam `.name === "Error"` do Error.prototype. Checar
// por STRING de nome (como esta funcao fazia antes) nunca casava com nada:
// esse branch inteiro era morto em silencio, e o breaker so abria mesmo por
// codigo de socket bruto (ECONNREFUSED etc.) ou pelo nosso TimeoutError.
// Achado escrevendo o teste de ciclo completo contra Redis real morto (ver
// RedisCircuitBreaker.deadRedis.cycle.test.ts) — `instanceof` e' a unica
// forma confiavel de identificar essas classes.
const CONNECTION_ERROR_CLASSES = [
    SocketClosedUnexpectedlyError,
    ClientClosedError,
    ClientOfflineError,
    ConnectionTimeoutError,
];

// Compartilhado entre RedisCacheAdapter e RedisRateLimiterAdapter — a
// classificacao precisa ser IDENTICA nos dois, senao um adapter abre o
// breaker compartilhado por um motivo que o outro nao consideraria falha.
//
// Timeout explicito (nosso, via withTimeout) sempre conta como falha de
// conexao — se deu timeout, na pratica nao ha um Redis respondendo dentro do
// prazo aceitavel. Erros de socket/conexao do node-redis tambem. Qualquer
// OUTRA coisa (resposta de erro valida do Redis, ex.: bug de sintaxe no
// script Lua, WRONGTYPE) NAO e' falha de conexao — e' isso que evita um bug
// de aplicacao abrir o circuit breaker sozinho e desligar a protecao
// distribuida por engano.
export function isRedisConnectionFailure(error: unknown): boolean {
    if (error instanceof TimeoutError) {
        return true;
    }
    if (CONNECTION_ERROR_CLASSES.some((ErrorClass) => error instanceof ErrorClass)) {
        return true;
    }
    const code = (error as { code?: string } | null)?.code;
    if (typeof code === "string" && CONNECTION_ERROR_CODES.has(code)) {
        return true;
    }
    return false;
}
