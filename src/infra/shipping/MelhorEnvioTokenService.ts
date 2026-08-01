import { MelhorEnvioConnection } from "../../domain/entites/MelhorEnvioConnection";
import { IntegrationNotConnectedError } from "../../domain/errors/IntegrationNotConnectedError";
import { RepositoryPort } from "../../domain/repository/RepositoryPort";

export interface MelhorEnvioRefreshedTokens {
    accessToken: string;
    refreshToken: string;
    expiresInSeconds: number;
}

export type MelhorEnvioRefreshTokenFetcher = (refreshToken: string) => Promise<MelhorEnvioRefreshedTokens>;

const CONNECTION_ID = "default";

export class MelhorEnvioTokenService {
    constructor(
        private connectionRepo: RepositoryPort<MelhorEnvioConnection>,
        private refreshToken: MelhorEnvioRefreshTokenFetcher
    ) {}

    async getValidAccessToken(): Promise<string> {
        const connection = await this.findActiveConnection();
        if (!connection.isExpired()) {
            return connection.accessToken;
        }

        const refreshed = await this.refreshToken(connection.refreshToken);
        connection.updateTokens(refreshed.accessToken, refreshed.refreshToken, this.calculateExpiresAt(refreshed.expiresInSeconds));
        await this.connectionRepo.update(CONNECTION_ID, connection);
        return connection.accessToken;
    }

    async isConnected(): Promise<boolean> {
        const connection = await this.connectionRepo.findById(CONNECTION_ID);
        return Boolean(connection && !connection.deleted_at);
    }

    async saveConnection(accessToken: string, refreshToken: string, expiresInSeconds: number): Promise<void> {
        const expiresAt = this.calculateExpiresAt(expiresInSeconds);
        const existing = await this.connectionRepo.findById(CONNECTION_ID);
        if (existing) {
            existing.updateTokens(accessToken, refreshToken, expiresAt);
            await this.connectionRepo.update(CONNECTION_ID, existing);
            return;
        }
        const connection = MelhorEnvioConnection.build(CONNECTION_ID, accessToken, refreshToken, expiresAt);
        await this.connectionRepo.save(connection);
    }

    private async findActiveConnection(): Promise<MelhorEnvioConnection> {
        const connection = await this.connectionRepo.findById(CONNECTION_ID);
        if (!connection || connection.deleted_at) {
            throw new IntegrationNotConnectedError("Conta do Melhor Envio ainda não foi conectada.");
        }
        return connection;
    }

    private calculateExpiresAt(expiresInSeconds: number): Date {
        return new Date(Date.now() + expiresInSeconds * 1000);
    }
}
