import { beforeEach, describe, expect, it } from "vitest";
import { DeleteAddress } from "../../../src/app/addresses/useCase/DeleteAddress";
import { Address } from "../../../src/domain/entites/Address";
import { NotFoundError } from "../../../src/domain/errors/NotFoundError";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const buildAddress = (userId: string) =>
    Address.build(
        () => "endereco-id-1",
        userId,
        "João da Silva",
        "01310100",
        "Avenida Paulista",
        "1000",
        null,
        "Bela Vista",
        "São Paulo",
        "SP",
        "Casa"
    );

describe("DeleteAddress", () => {
    let addressRepository: InMemoryRepository<Address>;
    let useCase: DeleteAddress;

    beforeEach(() => {
        addressRepository = new InMemoryRepository<Address>();
        useCase = new DeleteAddress(addressRepository);
    });

    it("remove um endereço pertencente ao usuário", async () => {
        const address = buildAddress("user-1");
        await addressRepository.save(address);

        await useCase.execute({ userId: "user-1", addressId: address.id });

        expect(await addressRepository.findById(address.id)).toBeUndefined();
    });

    it("recusa remover endereço de outro usuário", async () => {
        const address = buildAddress("user-1");
        await addressRepository.save(address);

        await expect(useCase.execute({ userId: "user-2", addressId: address.id })).rejects.toThrow(NotFoundError);
        expect(await addressRepository.findById(address.id)).toBeDefined();
    });

    it("recusa remover endereço inexistente", async () => {
        await expect(
            useCase.execute({ userId: "user-1", addressId: "endereco-inexistente" })
        ).rejects.toThrow("Endereço não encontrado.");
    });
});
