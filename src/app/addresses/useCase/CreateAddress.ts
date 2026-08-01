import { Address } from "../../../domain/entites/Address";
import { BusinessRuleError } from "../../../domain/errors/BusinessRuleError";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { AddressOutput } from "../dto/AddressOutput";
import { CreateAddressInput } from "../dto/CreateAddressInput";

const MAX_ADDRESSES_PER_USER = 5;

export class CreateAddress {
    constructor(private addressRepo: RepositoryPort<Address>, private createId: CreateId) {}

    async execute(input: CreateAddressInput): Promise<AddressOutput> {
        const existingAddresses = await this.addressRepo.findMany({ userId: input.userId });
        if (existingAddresses.length >= MAX_ADDRESSES_PER_USER) {
            throw new BusinessRuleError(`Limite de ${MAX_ADDRESSES_PER_USER} endereços por usuário atingido.`);
        }

        const address = Address.build(
            this.createId,
            input.userId,
            input.recipientName,
            input.zipCode,
            input.street,
            input.number,
            input.complement,
            input.neighborhood,
            input.city,
            input.state,
            input.label
        );
        await this.addressRepo.save(address);

        return {
            id: address.id,
            recipientName: address.recipientName,
            zipCode: address.zipCode,
            street: address.street,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            label: address.label,
        };
    }
}
