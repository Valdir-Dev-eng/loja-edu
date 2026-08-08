import { RateLimitDecision, RateLimitPolicy, RateLimitState, RateLimitTierConfig } from "../../domain/rateLimit/RateLimitPolicy";
import { RateLimiterPort } from "../../domain/rateLimit/RateLimiterPort";

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_SWEEP_INTERVAL_MS = 30_000;

interface StoredState extends RateLimitState {
    expiresAt: number;
}

// Fallback local pro rate limiter quando o Redis esta indisponivel (breaker
// aberto). Imprecisao aceita: cada processo tem seu proprio Map, nao ha
// coordenacao entre instancias — combinado, roda um processo so. Reusa
// RateLimitPolicy (mesma logica pura ja testada do caminho via Redis) e so
// cuida de onde o estado mora: um Map limitado, com LRU e varredura
// periodica, pra uma queda longa com muitos IPs diferentes nao virar
// vazamento de memoria.
export class InMemoryRateLimiter extends RateLimiterPort {
    private readonly states = new Map<string, StoredState>();
    private readonly maxEntries: number;
    private sweepTimer: ReturnType<typeof setInterval> | null;

    constructor(maxEntries = DEFAULT_MAX_ENTRIES, sweepIntervalMs = DEFAULT_SWEEP_INTERVAL_MS) {
        super();
        this.maxEntries = maxEntries;
        this.sweepTimer = setInterval(() => this.sweepExpired(), sweepIntervalMs);
        // Sem unref() o timer segura o processo vivo mesmo depois de todo o
        // resto ja ter parado — nunca deixa o Node encerrar sozinho.
        this.sweepTimer.unref();
    }

    // Chamar no shutdown do processo e no afterEach dos testes — sem isso o
    // timer vaza entre execucoes de teste (suite pendurada intermitente).
    stop(): void {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer);
            this.sweepTimer = null;
        }
    }

    async consume(key: string, config: RateLimitTierConfig): Promise<RateLimitDecision> {
        const now = Date.now();
        const state = this.getOrCreate(key);
        const decision = new RateLimitPolicy(config).evaluate(state);

        if (decision.allowed) {
            state.lastRequestAt = now;
            state.requestTimestampsInWindow = [
                ...state.requestTimestampsInWindow.filter((timestamp) => now - timestamp < config.windowMs),
                now,
            ];
        } else {
            // So registra um bloqueio NOVO se a negativa veio de estourar a
            // janela agora — se ja estava bloqueado, ou foi so o
            // minIntervalMs, o estado existente ja reflete isso certo.
            const alreadyBlocked = state.blockedUntil !== null && now < state.blockedUntil;
            const minIntervalDenial = state.lastRequestAt !== null && now - state.lastRequestAt < config.minIntervalMs;
            if (!alreadyBlocked && !minIntervalDenial) {
                state.blockedUntil = now + config.blockDurationMs;
            }
        }

        state.expiresAt = now + Math.max(config.windowMs, config.blockDurationMs, config.minIntervalMs);
        this.touch(key, state);
        return decision;
    }

    private getOrCreate(key: string): StoredState {
        const existing = this.states.get(key);
        if (existing) {
            return existing;
        }
        const created: StoredState = {
            lastRequestAt: null,
            requestTimestampsInWindow: [],
            blockedUntil: null,
            expiresAt: Date.now(),
        };
        this.states.set(key, created);
        this.enforceCap();
        return created;
    }

    // LRU via Map: apagar e reinserir bota a chave no fim da ordem de
    // iteracao (a mais recentemente usada) — Map do JS preserva ordem de
    // insercao, entao o INICIO da iteracao e' sempre a mais antiga.
    private touch(key: string, state: StoredState): void {
        this.states.delete(key);
        this.states.set(key, state);
    }

    private enforceCap(): void {
        while (this.states.size > this.maxEntries) {
            const oldestKey = this.states.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            this.states.delete(oldestKey);
        }
    }

    private sweepExpired(): void {
        const now = Date.now();
        for (const [key, state] of this.states) {
            if (state.expiresAt < now) {
                this.states.delete(key);
            }
        }
    }
}
