import { Address } from "../../../domain/entites/Address";
import { User } from "../../../domain/entites/User";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { CompleteOnboardingInput } from "../dto/CompleteOnboardingInput";
import { CompleteOnboardingOutput } from "../dto/CompleteOnboardingOutput";

export class CompleteOnboarding {
    constructor(
        private userRepository: RepositoryPort<User>,
        private addressRepository: RepositoryPort<Address>,
        private createId: CreateId
    ) {}

    async execute(input: CompleteOnboardingInput): Promise<CompleteOnboardingOutput> {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new NotFoundError("Usuário não encontrado.");
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

        return {
            id: user.id,
            fullName: user.fullName as string,
            document: user.document,
            onboardingCompleted: user.onboardingCompleted,
        };
    }
}
