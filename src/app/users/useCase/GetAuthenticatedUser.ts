import { CachePort } from "../../../domain/database/CachePort";
import { User } from "../../../domain/entites/User";
import { UnauthorizedError } from "../../../domain/errors/UnauthorizedError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { ServiceAuthToken } from "../../../infra/security/ServiceAuthToken";
import { GetAuthenticatedUserInput } from "../dto/GetAuthenticatedUserInput";
import { UserOutput } from "../dto/UserOutput";
import { USER_CACHE_TTL_SECONDS, userByIdCacheKey } from "../UserCacheKeys";

export class GetAuthenticatedUser {
    constructor(
        private serviceAuthToken: ServiceAuthToken,
        private userRepository: RepositoryPort<User>,
        private cache: CachePort
    ) {}

    async execute(input: GetAuthenticatedUserInput): Promise<UserOutput> {
        if (!input.token) {
            throw new UnauthorizedError("Sessão ausente.");
        }
        const payload = await this.serviceAuthToken.verifySessionToken<{ id: string }>(input.token);

        const cacheKey = userByIdCacheKey(payload.id);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as UserOutput;
        }

        const user = await this.userRepository.findById(payload.id);
        if (!user || user.deleted_at) {
            throw new UnauthorizedError("Sessão inválida.");
        }
        const output: UserOutput = {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            onboardingCompleted: user.onboardingCompleted,
            isAdmin: user.isAdmin(),
        };

        await this.cache.set(cacheKey, JSON.stringify(output), USER_CACHE_TTL_SECONDS);
        return output;
    }
}
