import { Address } from "../../../domain/entites/Address";
import { NotFoundError } from "../../../domain/errors/NotFoundError";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { DeleteAddressInput } from "../dto/DeleteAddressInput";

export class DeleteAddress {
    constructor(private addressRepo: RepositoryPort<Address>) {}

    async execute(input: DeleteAddressInput): Promise<void> {
        const address = await this.addressRepo.findById(input.addressId);
        if (!address || address.userId !== input.userId) {
            throw new NotFoundError("Endereço não encontrado.");
        }
        address.softDelete();
        await this.addressRepo.delete(address.id);
    }
}
