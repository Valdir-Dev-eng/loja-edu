import { beforeEach, describe, expect, it } from "vitest";
import { ListUsersForAdmin } from "../../../src/app/users/useCase/ListUsersForAdmin";
import { User, UserRole } from "../../../src/domain/entites/User";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const createId = () => "user-id-1";

const buildUseCase = () => {
    const userRepo = new InMemoryRepository<User>();
    const useCase = new ListUsersForAdmin(userRepo);
    return { useCase, userRepo };
};

describe("ListUsersForAdmin", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("lista os usuários com e-mail, username, papel e status de onboarding", async () => {
        const user = User.build(createId, "joao@gmail.com", "joao");
        user.promoteToAdmin();
        await context.userRepo.save(user);

        const output = await context.useCase.execute();

        expect(output).toEqual([
            { id: user.id, email: "joao@gmail.com", username: "joao", role: UserRole.ADMIN, onboardingCompleted: false },
        ]);
    });

    it("retorna lista vazia quando não há usuários", async () => {
        const output = await context.useCase.execute();

        expect(output).toEqual([]);
    });
});
