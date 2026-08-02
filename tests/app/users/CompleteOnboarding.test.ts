import { beforeEach, describe, expect, it } from "vitest";
import { CompleteOnboarding } from "../../../src/app/users/useCase/CompleteOnboarding";
import { AddressInput } from "../../../src/app/users/dto/AddressInput";
import { userByIdCacheKey } from "../../../src/app/users/UserCacheKeys";
import { Address } from "../../../src/domain/entites/Address";
import { User } from "../../../src/domain/entites/User";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { ConflictError } from "../../../src/domain/errors/ConflictError";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";
import { FakeCachePort } from "../../doubles/FakeCachePort";

const validAddress: AddressInput = {
    recipientName: "João da Silva",
    zipCode: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    label: "Casa",
};

const buildUseCase = () => {
    const userRepository = new InMemoryRepository<User>();
    const addressRepository = new InMemoryRepository<Address>();
    const cache = new FakeCachePort();
    let sequence = 0;
    const createId = () => `generated-id-${++sequence}`;
    const useCase = new CompleteOnboarding(userRepository, addressRepository, cache, createId);
    return { useCase, userRepository, addressRepository, cache, createId };
};

describe("CompleteOnboarding", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("conclui o onboarding salvando nome completo e endereço", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);

        const output = await context.useCase.execute({
            userId: user.id,
            fullName: "João da Silva",
            document: "52998224725",
            addresses: [validAddress],
        });

        expect(output.fullName).toBe("João da Silva");
        expect(output.onboardingCompleted).toBe(true);
        const persistedUser = await context.userRepository.findById(user.id);
        expect(persistedUser?.fullName).toBe("João da Silva");
        expect(persistedUser?.onboardingCompleted).toBe(true);
    });

    it("salva todos os endereços informados vinculados ao usuário", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);
        const secondAddress: AddressInput = { ...validAddress, zipCode: "20040020", city: "Rio de Janeiro", state: "RJ" };

        await context.useCase.execute({
            userId: user.id,
            fullName: "João da Silva",
            document: "52998224725",
            addresses: [validAddress, secondAddress],
        });

        const savedAddresses = await context.addressRepository.findAll();
        expect(savedAddresses).toHaveLength(2);
        expect(savedAddresses.every((address) => address.userId === user.id)).toBe(true);
    });

    it("preserva a identificação (label) de cada endereço salvo", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);
        const workAddress: AddressInput = { ...validAddress, label: "Trabalho" };

        await context.useCase.execute({
            userId: user.id,
            fullName: "João da Silva",
            document: "52998224725",
            addresses: [workAddress],
        });

        const [savedAddress] = await context.addressRepository.findAll();
        expect(savedAddress.label).toBe("Trabalho");
    });

    it("recusa concluir onboarding para usuário inexistente", async () => {
        await expect(
            context.useCase.execute({
                userId: "id-inexistente",
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [validAddress],
            })
        ).rejects.toThrow(NotFoundError);
        await expect(
            context.useCase.execute({
                userId: "id-inexistente",
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [validAddress],
            })
        ).rejects.toThrow("Usuário não encontrado.");
    });

    it("recusa concluir onboarding com endereço em formato inválido", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);
        const invalidAddress: AddressInput = { ...validAddress, zipCode: "123" };

        await expect(
            context.useCase.execute({
                userId: user.id,
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [invalidAddress],
            })
        ).rejects.toThrow(BusinessRuleError);
    });

    it("recusa concluir onboarding sem nome completo", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);

        await expect(
            context.useCase.execute({
                userId: user.id,
                fullName: "   ",
                document: "52998224725",
                addresses: [validAddress],
            })
        ).rejects.toThrow(BusinessRuleError);
    });

    it("recusa concluir onboarding sem nenhum endereço", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);

        await expect(
            context.useCase.execute({
                userId: user.id,
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [],
            })
        ).rejects.toThrow(BusinessRuleError);
    });

    it("recusa concluir onboarding com documento inválido", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);

        await expect(
            context.useCase.execute({
                userId: user.id,
                fullName: "João da Silva",
                document: "123",
                addresses: [validAddress],
            })
        ).rejects.toThrow(BusinessRuleError);
    });

    it("recusa concluir onboarding já concluído anteriormente", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        user.completeOnboarding("João da Silva", 1, "52998224725");
        await context.userRepository.save(user);

        await expect(
            context.useCase.execute({
                userId: user.id,
                fullName: "João da Silva",
                document: "52998224725",
                addresses: [validAddress],
            })
        ).rejects.toThrow(ConflictError);
    });

    it("invalida o cache do usuário ao concluir o onboarding", async () => {
        const user = User.build(context.createId, "joao@gmail.com", "joao");
        await context.userRepository.save(user);
        await context.cache.set(userByIdCacheKey(user.id), JSON.stringify({ stale: true }), 60);

        await context.useCase.execute({
            userId: user.id,
            fullName: "João da Silva",
            document: "52998224725",
            addresses: [validAddress],
        });

        expect(await context.cache.get(userByIdCacheKey(user.id))).toBeNull();
    });
});
