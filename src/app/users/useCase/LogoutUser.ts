import { UnauthorizedError } from "../../../domain/errors/UnauthorizedError";
import { ServiceAuthToken } from "../../../infra/security/ServiceAuthToken";
import { LogoutInput } from "../dto/LogoutInput";

export class LogoutUser {
    constructor(private serviceAuthToken: ServiceAuthToken) {}

    async execute(input: LogoutInput): Promise<void> {
        if (!input.token) {
            throw new UnauthorizedError("Sessão inválida.");
        }
        await this.serviceAuthToken.revoke(input.token);
    }
}
