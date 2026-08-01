import { User } from "../../../domain/entites/User";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { AdminUserOutput } from "../dto/AdminUserOutput";

export class ListUsersForAdmin {
    constructor(private userRepo: RepositoryPort<User>) {}

    async execute(): Promise<AdminUserOutput[]> {
        const users = await this.userRepo.findAll();
        return users.map((user) => ({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            onboardingCompleted: user.onboardingCompleted,
        }));
    }
}
