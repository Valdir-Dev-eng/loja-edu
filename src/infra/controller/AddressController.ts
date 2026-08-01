import { AddressInput } from "../../app/users/dto/AddressInput";
import { CreateAddress } from "../../app/addresses/useCase/CreateAddress";
import { DeleteAddress } from "../../app/addresses/useCase/DeleteAddress";
import { ListMyAddresses } from "../../app/addresses/useCase/ListMyAddresses";

export class AddressController {
    constructor(
        private listMyAddresses: ListMyAddresses,
        private createAddress: CreateAddress,
        private deleteAddress: DeleteAddress
    ) {}

    async list(userId: string) {
        return await this.listMyAddresses.execute(userId);
    }

    async create(userId: string, input: AddressInput) {
        return await this.createAddress.execute({ userId, ...input });
    }

    async delete(userId: string, addressId: string) {
        await this.deleteAddress.execute({ userId, addressId });
    }
}
