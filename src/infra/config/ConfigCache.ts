import { ConfigEnv } from "./ConfigEnv";

export interface ICacheSecret {
   key:string
   host:string
   port:number
   timeoutMs:number
}

// Timeout medido em dev (RTT ate uma instancia remota do Redis Cloud, PING
// p99=159ms, EVAL do rate limiter p99=188ms) — REDIS_TIMEOUT_MS=1000 da
// bastante folga sobre isso (~5x o p99 medido). ISSO PRECISA SER REMEDIDO NO
// AMBIENTE DE DEPLOY: app e Redis na mesma regiao tendem a ter RTT de 1-5ms,
// nao ~130ms — um timeout de 1000ms la seria ~200x o p99 real e faria o
// circuit breaker demorar uma eternidade pra abrir quando o Redis cair de
// verdade. Mesmo procedimento de medicao (PING e EVAL, varias amostras, p50
// e p99), timeout com folga generosa sobre o p99 medido NAQUELE ambiente.
const DEFAULT_TIMEOUT_MS = 1000;

export class ConfigCache {
    constructor(private config:ConfigEnv){
    }
    static getSecrets(): ICacheSecret {
        return {
            key: ConfigEnv.getVariable("API_KEY_REDIS"),
            host: ConfigEnv.getVariable("REDIS_HOST"),
            port: Number.parseInt(ConfigEnv.getVariable("REDIS_PORT")),
            timeoutMs: Number.parseInt(ConfigEnv.getOptionalVariable("REDIS_TIMEOUT_MS") ?? String(DEFAULT_TIMEOUT_MS)),
        }
    }
}