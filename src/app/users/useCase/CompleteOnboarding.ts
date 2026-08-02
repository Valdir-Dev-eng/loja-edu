import { CachePort } from "../../../domain/database/CachePort";
import { Address } from "../../../domain/entites/Address";
import { User } from "../../../domain/entites/User";
import { ConflictError } from "../../../domain/errors/ConflictError";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { CompleteOnboardingInput } from "../dto/CompleteOnboardingInput";
import { CompleteOnboardingOutput } from "../dto/CompleteOnboardingOutput";
import { userByIdCacheKey } from "../UserCacheKeys";

export class CompleteOnboarding {
    constructor(
        private userRepository: RepositoryPort<User>,
        private addressRepository: RepositoryPort<Address>,
        private cache: CachePort,
        private createId: CreateId
    ) {}

    async execute(input: CompleteOnboardingInput): Promise<CompleteOnboardingOutput> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new NotFoundError("Usuário não encontrado.");
        }

        const normalizedDocument = input.document.replace(/\D/g, "");
        const existingDocumentOwner = await this.userRepository.findBy({ document: normalizedDocument });
        if (existingDocumentOwner && existingDocumentOwner.id !== user.id) {
            throw new ConflictError("Este CPF/CNPJ já está cadastrado em outra conta.");
        }

        const addresses = input.addresses.map((address) =>
            Address.build(
                this.createId,
                user.id,
                address.recipientName,
                address.zipCode,
                address.street,
                address.number,
                address.complement,
                address.neighborhood,
                address.city,
                address.state,
                address.label
            )
        );

        user.completeOnboarding(input.fullName, addresses.length, input.document);

        await this.userRepository.update(user.id, {
            fullName: user.fullName,
            document: user.document,
            onboardingCompleted: user.onboardingCompleted,
        });
        await Promise.all(addresses.map((address) => this.addressRepository.save(address)));
        await this.cache.del(userByIdCacheKey(user.id));

        return {
            id: user.id,
            fullName: user.fullName as string,
            document: user.document,
            onboardingCompleted: user.onboardingCompleted,
        };
    }
}
