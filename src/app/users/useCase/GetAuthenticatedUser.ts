import { User } from "../../../domain/entites/User";
import { UnauthorizedError } from "../../../domain/errors/UnauthorizedError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ServiceAuthToken } from "../../../infra/security/ServiceAuthToken";
import { GetAuthenticatedUserInput } from "../dto/GetAuthenticatedUserInput";
import { UserOutput } from "../dto/UserOutput";

export class GetAuthenticatedUser {
    constructor(private serviceAuthToken: ServiceAuthToken, private userRepository: RepositoryPort<User>) {}

    async execute(input: GetAuthenticatedUserInput): Promise<UserOutput> {
        if (!input.token) {
            throw new UnauthorizedError("Sessão ausente.");
        }
        const payload = await this.serviceAuthToken.verifySessionToken<{ id: string }>(input.token);
        const user = await this.userRepository.findById(payload.id);
        if (!user || user.deleted_at) {
            throw new UnauthorizedError("Sessão inválida.");
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            onboardingCompleted: user.onboardingCompleted,
            isAdmin: user.isAdmin(),
        };
    }
}
