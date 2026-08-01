import { AddressInput } from "../../users/dto/AddressInput";

export interface CreateAddressInput extends AddressInput {
    userId: string;
}
