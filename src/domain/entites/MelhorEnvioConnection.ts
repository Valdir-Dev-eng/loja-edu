import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";

export class MelhorEnvioConnection {
    constructor(
        public readonly id: string,
        public accessToken: string,
        public refreshToken: string,
        public expiresAt: Date,
        public updated_at: Date = new Date(),
        public deleted_at: Date | null = null
    ) {}

    static build(id: string, accessToken: string, refreshToken: string, expiresAt: Date): MelhorEnvioConnection {
        if (!accessToken || !refreshToken) {
            throw new BusinessRuleError("Tokens de conexão do Melhor Envio inválidos.");
        }
        return new MelhorEnvioConnection(id, accessToken, refreshToken, expiresAt);
    }

    isExpired(now: Date = new Date()): boolean {
        return now.getTime() >= this.expiresAt.getTime();
    }

    updateTokens(accessToken: string, refreshToken: string, expiresAt: Date): void {
        if (!accessToken || !refreshToken) {
            throw new BusinessRuleError("Tokens de conexão do Melhor Envio inválidos.");
        }
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = expiresAt;
        this.updated_at = new Date();
    }

    softDelete(): void {
        if (this.deleted_at) {
            throw new ConflictError("Conexão com o Melhor Envio já está desconectada.");
        }
        this.deleted_at = new Date();
    }
}
