export type CircuitBreakerState = "closed" | "open";

export interface CircuitBreakerOptions {
    /** Falhas de CONEXAO consecutivas ate abrir. Erro de comando nunca conta aqui. */
    failureThreshold: number;
    /** Intervalo entre sondas de meia-abertura enquanto aberto. */
    halfOpenIntervalMs: number;
}

// Uma unica instancia e' compartilhada entre RedisCacheAdapter e
// RedisRateLimiterAdapter — de proposito, nao acoplamento acidental: e' o
// MESMO Redis. Se a conexao do cache cai, o breaker abre pros dois; se o
// rate limiter comeca a falhar, o cache tambem passa a bypassar o Redis.
// Isso e' intencional porque uma falha de rede/instancia normalmente afeta
// as duas conexoes juntas (mesmo host, mesma queda de rede) — nao tratar
// como estado unico faria o site continuar tentando (e esperando timeout)
// numa metade da aplicacao enquanto a outra ja sabe que esta fora do ar.
export class RedisCircuitBreaker {
    private state: CircuitBreakerState = "closed";
    private consecutiveConnectionFailures = 0;
    private openedAt: number | null = null;
    private nextProbeAt = 0;
    private halfOpenClaimed = false;
    private degradedRequestCount = 0;

    constructor(private readonly options: CircuitBreakerOptions) {}

    get currentState(): CircuitBreakerState {
        return this.state;
    }

    // Chamar ANTES de tentar qualquer operacao no Redis. `true` = pode
    // tentar (fechado, ou esta reivindicando a sonda de meia-abertura);
    // `false` = bypass direto pro fallback, nem toca no Redis.
    //
    // Zero `await` entre a leitura de `halfOpenClaimed` e a escrita dela —
    // atomico por construcao (JS de thread unica, sem ponto de interrupcao
    // no meio), mesma disciplina do updateIfEqual/decrementIfSufficient.
    // Sem isso, N requests chegando juntas no instante da sonda virariam N
    // tentativas reais no Redis, nao uma so.
    shouldAttemptRedis(): boolean {
        if (this.state === "closed") {
            return true;
        }
        if (Date.now() < this.nextProbeAt) {
            this.degradedRequestCount++;
            return false;
        }
        if (this.halfOpenClaimed) {
            this.degradedRequestCount++;
            return false;
        }
        this.halfOpenClaimed = true;
        return true;
    }

    recordSuccess(): void {
        if (this.state === "open") {
            const downForMs = this.openedAt !== null ? Date.now() - this.openedAt : 0;
            console.log(
                `[RedisCircuitBreaker] UP novamente apos ${downForMs}ms fora do ar — ${this.degradedRequestCount} requests servidas em modo degradado nesse intervalo`
            );
        }
        this.state = "closed";
        this.consecutiveConnectionFailures = 0;
        this.openedAt = null;
        this.halfOpenClaimed = false;
        this.degradedRequestCount = 0;
    }

    // Falha de CONEXAO/timeout — a unica categoria que move o contador e
    // pode abrir o breaker.
    recordConnectionFailure(): void {
        this.halfOpenClaimed = false; // libera a proxima sonda; essa falhou

        if (this.state === "open") {
            this.nextProbeAt = Date.now() + this.options.halfOpenIntervalMs;
            return;
        }

        this.consecutiveConnectionFailures++;
        if (this.consecutiveConnectionFailures >= this.options.failureThreshold) {
            this.state = "open";
            this.openedAt = Date.now();
            this.nextProbeAt = Date.now() + this.options.halfOpenIntervalMs;
            this.degradedRequestCount = 0;
            console.error(
                `[RedisCircuitBreaker] DOWN — ${this.consecutiveConnectionFailures} falhas de conexão seguidas. Abrindo o circuito, servindo em modo degradado.`
            );
        }
    }

    // Falha de COMANDO (bug de script, resposta de erro valida do Redis) —
    // NUNCA move o contador nem abre o breaker. Um bug de aplicacao nao e'
    // "Redis fora do ar", e contar isso aqui desligaria silenciosamente a
    // protecao distribuida por meses ate alguem notar. So loga alto — quem
    // chamou decide como degradar essa requisicao especifica.
    recordCommandFailure(error: unknown): void {
        console.error("[RedisCircuitBreaker] ERRO DE COMANDO (não abre o circuito — investigar, pode ser bug de aplicação):", error);
    }
}
