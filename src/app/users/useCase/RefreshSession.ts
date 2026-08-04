import { User } from "../../../domain/entites/User";
import { UnauthorizedError } from "../../../domain/errors/UnauthorizedError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ServiceAuthToken } from "../../../infra/security/ServiceAuthToken";
import { RefreshSessionInput } from "../dto/RefreshSessionInput";
import { RefreshSessionOutput } from "../dto/RefreshSessionOutput";

export class RefreshSession {
    constructor(
        private serviceAuthToken: ServiceAuthToken,
        private userRepository: RepositoryPort<User>
    ) {}

    async execute(input: RefreshSessionInput): Promise<RefreshSessionOutput> {
        if (!input.refreshToken) {
            throw new UnauthorizedError("Sessão ausente.");
        }
        const payload = await this.serviceAuthToken.verifyRefreshToken<{ id: string }>(input.refreshToken);
        const user = await this.userRepository.findById(payload.id);
        if (!user || user.deleted_at) {
            throw new UnauthorizedError("Sessão inválida.");
        }
        const accessToken = this.serviceAuthToken.generateToken({ id: user.id });
        return { accessToken };
    }
}
