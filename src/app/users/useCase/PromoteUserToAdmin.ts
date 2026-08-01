import { User } from "../../../domain/entites/User";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { PromoteUserToAdminInput } from "../dto/PromoteUserToAdminInput";
import { PromoteUserToAdminOutput } from "../dto/PromoteUserToAdminOutput";

export class PromoteUserToAdmin {
    constructor(private userRepository: RepositoryPort<User>) {}

    async execute(input: PromoteUserToAdminInput): Promise<PromoteUserToAdminOutput> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new NotFoundError("Usuário não encontrado.");
        }
        user.promoteToAdmin();
        await this.userRepository.update(user.id, { role: user.role });
        return { id: user.id, role: user.role };
    }
}
