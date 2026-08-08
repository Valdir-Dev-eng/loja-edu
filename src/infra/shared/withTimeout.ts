export class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TimeoutError";
    }
}

// Faz quem chamou desistir de esperar apos `ms` — NAO cancela a operacao
// original. Se ela for uma query/comando de rede, continua rodando do outro
// lado ate terminar por conta propria; qualquer recurso que ela segure (ex.:
// uma conexao do pool do Postgres) so libera quando ISSO acontecer, nao
// quando o timeout aqui dispara. Ver comentario em PostgresDataAccess.ts
// sobre por que isso nao substitui um statement_timeout do lado do servidor.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(`${label} excedeu ${ms}ms`)), ms);
        timer.unref?.();
    });

    // Se a promise original resolver ou rejeitar DEPOIS do timeout ja ter
    // vencido a corrida, essa rejeicao nao tem mais ninguem esperando por
    // ela — sem isso vira unhandled rejection solto no processo.
    promise.catch(() => {});

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
