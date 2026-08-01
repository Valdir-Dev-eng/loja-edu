import { Address } from "../../../domain/entites/Address";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { AddressOutput } from "../dto/AddressOutput";

export class ListMyAddresses {
    constructor(private addressRepo: RepositoryPort<Address>) {}

    async execute(userId: string): Promise<AddressOutput[]> {
        const addresses = await this.addressRepo.findMany({ userId });
        return addresses.map((address) => this.toOutput(address));
    }

    private toOutput(address: Address): AddressOutput {
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
