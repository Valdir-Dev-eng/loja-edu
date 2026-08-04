import { UnauthorizedError } from "../../../domain/errors/UnauthorizedError";
import { ServiceAuthToken } from "../../../infra/security/ServiceAuthToken";
import { LogoutInput } from "../dto/LogoutInput";

const REFRESH_TOKEN_BLACKLIST_TTL_SECONDS = 2 * 24 * 60 * 60;

export class LogoutUser {
    constructor(private serviceAuthToken: ServiceAuthToken) {}

    async execute(input: LogoutInput): Promise<void> {
        if (!input.token) {
            throw new UnauthorizedError("Sessão inválida.");
        }
        await this.serviceAuthToken.revoke(input.token);
        if (input.refreshToken) {
            await this.serviceAuthToken.revoke(input.refreshToken, REFRESH_TOKEN_BLACKLIST_TTL_SECONDS);
        }
    }
}
