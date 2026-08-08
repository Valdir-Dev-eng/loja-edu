import { afterEach, describe, expect, it } from "vitest";
import { ConflictError } from "../../src/domain/errors/ConflictError";
import { User } from "../../src/domain/entites/User";
import { PostgresDataAccess } from "../../src/infra/database/PostgresDataAccess";
import { UserRepository } from "../../src/infra/repository/UserRepository";

// Prova real (Postgres do projeto, não Fake) de um bug visto em produção:
// duas escritas concorrentes furam a checagem otimista de CompleteOnboarding
// (findBy → compara → escreve) e a SEGUNDA esbarra no índice único real do
// banco (users_document_unique_idx). Isso é correto — o índice é quem
// realmente impede o duplicado —, mas o PostgresError cru (code 23505) não
// era reconhecido pelo HttpErrorMapper e vazava como 500 genérico em vez do
// 409 que a mensagem de negócio já promete no caminho sem corrida.
describe("PostgresDataAccess — violação de unique constraint vira ConflictError (409), não PostgresError cru", () => {
    let db: PostgresDataAccess;
    let userRepository: UserRepository;
    let firstUserId: string | null = null;
    let secondUserId: string | null = null;

    afterEach(async () => {
        // O índice é parcial (WHERE document IS NOT NULL) e não filtra por
        // deleted_at — soft-delete sozinho não libera o valor. Zera o
        // document antes de remover, senão o próximo run deste teste
        // colide com o lixo do run anterior.
        for (const id of [firstUserId, secondUserId]) {
            if (!id) continue;
            await userRepository.update(id, { document: null as unknown as string });
            await userRepository.delete(id);
        }
        firstUserId = null;
        secondUserId = null;
    });

    it("INSERT com document duplicado lança ConflictError com o índice único real do banco", async () => {
        db = new PostgresDataAccess();
        userRepository = new UserRepository(db);

        const sharedDocument = `999${Date.now().toString().slice(-8)}`;
        const suffix = Math.random().toString(36).slice(2, 8);

        const firstUser = User.build(() => crypto.randomUUID(), `unique-violation-1-${suffix}@teste.com`, `uv1${suffix}`);
        firstUser.completeOnboarding("Primeiro Usuário", 1, sharedDocument);
        await userRepository.save(firstUser);
        firstUserId = firstUser.id;

        const secondUser = User.build(() => crypto.randomUUID(), `unique-violation-2-${suffix}@teste.com`, `uv2${suffix}`);
        secondUser.completeOnboarding("Segundo Usuário", 1, sharedDocument);
        secondUserId = secondUser.id;

        let caughtError: unknown;
        try {
            await userRepository.save(secondUser);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(ConflictError);
        expect((caughtError as Error).message).toBe("Este CPF/CNPJ já está cadastrado em outra conta.");
    });

    it("constraint sem mensagem mapeada (ex.: users_email_unique) cai no genérico, não quebra", async () => {
        db = new PostgresDataAccess();
        userRepository = new UserRepository(db);
        const suffix = Math.random().toString(36).slice(2, 8);
        const sharedEmail = `unique-violation-email-${suffix}@teste.com`;

        const firstUser = User.build(() => crypto.randomUUID(), sharedEmail, `uve1${suffix}`);
        await userRepository.save(firstUser);
        firstUserId = firstUser.id;

        const secondUser = User.build(() => crypto.randomUUID(), sharedEmail, `uve2${suffix}`);
        secondUserId = secondUser.id;

        let caughtError: unknown;
        try {
            await userRepository.save(secondUser);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(ConflictError);
        expect((caughtError as Error).message).toBe("Já existe um registro com esses dados.");
    });
});
