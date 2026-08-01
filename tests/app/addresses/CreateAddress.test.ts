import { beforeEach, describe, expect, it } from "vitest";
import { CreateAddress } from "../../../src/app/addresses/useCase/CreateAddress";
import { CreateAddressInput } from "../../../src/app/addresses/dto/CreateAddressInput";
import { Address } from "../../../src/domain/entites/Address";
import { BusinessRuleError } from "../../../src/domain/errors/BusinessRuleError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const validInput: CreateAddressInput = {
    userId: "user-1",
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

describe("CreateAddress", () => {
    let addressRepository: InMemoryRepository<Address>;
    let useCase: CreateAddress;
    let sequence: number;

    beforeEach(() => {
        addressRepository = new InMemoryRepository<Address>();
        sequence = 0;
        useCase = new CreateAddress(addressRepository, () => `endereco-id-${++sequence}`);
    });

    it("cria um endereço vinculado ao usuário", async () => {
        const output = await useCase.execute(validInput);

        expect(output.label).toBe("Casa");
        const persisted = await addressRepository.findById(output.id);
        expect(persisted?.userId).toBe("user-1");
    });

    it("permitindo cadastrar até o limite de 5 endereços", async () => {
        for (let i = 0; i < 5; i++) {
            await useCase.execute({ ...validInput, label: `Endereço ${i}` });
        }

        const result = await useCase.execute({ ...validInput, label: "Endereço 6" }).catch((error) => error);

        expect(result).toBeInstanceOf(BusinessRuleError);
    });

    it("recusa cadastrar o sexto endereço do mesmo usuário", async () => {
        for (let i = 0; i < 5; i++) {
            await useCase.execute({ ...validInput, label: `Endereço ${i}` });
        }

        await expect(useCase.execute({ ...validInput, label: "Endereço extra" })).rejects.toThrow(
            "Limite de 5 endereços por usuário atingido."
        );
    });

    it("não conta endereços de outro usuário no limite", async () => {
        for (let i = 0; i < 5; i++) {
            await useCase.execute({ ...validInput, userId: "outro-usuario", label: `Endereço ${i}` });
        }

        const output = await useCase.execute(validInput);

        expect(output.label).toBe("Casa");
    });

    it("recusa CEP fora do formato esperado", async () => {
        await expect(useCase.execute({ ...validInput, zipCode: "123" })).rejects.toThrow(BusinessRuleError);
    });
});
