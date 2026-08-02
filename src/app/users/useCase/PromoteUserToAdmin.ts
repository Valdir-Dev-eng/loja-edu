import { CachePort } from "../../../domain/database/CachePort";
import { User } from "../../../domain/entites/User";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { PromoteUserToAdminInput } from "../dto/PromoteUserToAdminInput";
import { PromoteUserToAdminOutput } from "../dto/PromoteUserToAdminOutput";
import { userByIdCacheKey } from "../UserCacheKeys";

export class PromoteUserToAdmin {
    constructor(private userRepository: RepositoryPort<User>, private cache: CachePort) {}

    async execute(input: PromoteUserToAdminInput): Promise<PromoteUserToAdminOutput> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new NotFoundError("Usuário não encontrado.");
        }
        user.promoteToAdmin();
        await this.userRepository.update(user.id, { role: user.role });
        await this.cache.del(userByIdCacheKey(user.id));
        return { id: user.id, role: user.role };
    }
}
