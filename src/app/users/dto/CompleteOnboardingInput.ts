import { AddressInput } from "./AddressInput";

export interface CompleteOnboardingInput {
    userId: string;
    fullName: string;
    document: string;
    addresses: AddressInput[];
}
