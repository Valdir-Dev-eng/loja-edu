import { AppModule } from "./infra/module/AppModule";

const port = Number(process.env.PORT) || 3000;
const app = new AppModule();
await app.listen(port);

const SHUTDOWN_TIMEOUT_MS = 2000;

// client.quit() contra um Redis inalcançável pode nunca resolver — sem
// prazo, o shutdown "limpo" trava o processo, ironicamente o mesmo tipo de
// travamento que essa fatia inteira existe pra evitar. Time-box + saída
// forçada garante que o processo sempre termina.
//
// No Windows, em watch mode (tsx/nodemon), o sinal frequentemente não chega
// até o processo filho — isso reduz a chance de conexão zumbi, não elimina.
// Quem protege de verdade contra Redis morto é o circuit breaker, não isso.
async function shutdown(signal: string): Promise<void> {
    console.log(`[main] recebido ${signal}, encerrando (prazo de ${SHUTDOWN_TIMEOUT_MS}ms)...`);
    await Promise.race([
        app.shutdown(),
        new Promise((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS)),
    ]);
    process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
