import { beforeEach, describe, expect, it } from "vitest";
import { PromoteUserToAdmin } from "../../../src/app/users/useCase/PromoteUserToAdmin";
import { User, UserRole } from "../../../src/domain/entites/User";
import { ConflictError } from "../../../src/domain/errors/ConflictError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const buildUseCase = () => {
    const userRepository = new InMemoryRepository<User>();
    const useCase = new PromoteUserToAdmin(userRepository);
    return { useCase, userRepository };
};

const createId = () => "user-id-1";

describe("PromoteUserToAdmin", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("promove o usuário informado a administrador", async () => {
        const user = User.build(createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);

        const output = await context.useCase.execute({ userId: user.id });

        expect(output).toEqual({ id: user.id, role: UserRole.ADMIN });
        const persistedUser = await context.userRepository.findById(user.id);
        expect(persistedUser?.role).toBe(UserRole.ADMIN);
    });

    it("recusa promover usuário inexistente", async () => {
        await expect(context.useCase.execute({ userId: "id-inexistente" })).rejects.toThrow(NotFoundError);
        await expect(context.useCase.execute({ userId: "id-inexistente" })).rejects.toThrow(
            "Usuário não encontrado."
        );
    });

    it("recusa promover usuário que já é administrador", async () => {
        const user = User.build(createId, "joao@gmail.com", "joao");
        user.promoteToAdmin();
        await context.userRepository.save(user);

        await expect(context.useCase.execute({ userId: user.id })).rejects.toThrow(ConflictError);
        await expect(context.useCase.execute({ userId: user.id })).rejects.toThrow("Usuário já é administrador.");
    });
});
