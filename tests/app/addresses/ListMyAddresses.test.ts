import { beforeEach, describe, expect, it } from "vitest";
import { ListMyAddresses } from "../../../src/app/addresses/useCase/ListMyAddresses";
import { Address } from "../../../src/domain/entites/Address";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

const createId = () => "endereco-id-1";

describe("ListMyAddresses", () => {
    let addressRepository: InMemoryRepository<Address>;
    let useCase: ListMyAddresses;

    beforeEach(() => {
        addressRepository = new InMemoryRepository<Address>();
        useCase = new ListMyAddresses(addressRepository);
    });

    it("lista apenas os endereços do usuário informado", async () => {
        const ownAddress = Address.build(
            createId,
            "user-1",
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
        const otherUserAddress = Address.build(
            () => "endereco-id-2",
            "user-2",
            "Maria",
            "20040020",
            "Avenida Rio Branco",
            "1",
            null,
            "Centro",
            "Rio de Janeiro",
            "RJ",
            "Casa"
        );
        await addressRepository.save(ownAddress);
        await addressRepository.save(otherUserAddress);

        const result = await useCase.execute("user-1");

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(ownAddress.id);
    });

    it("devolve lista vazia quando o usuário não tem nenhum endereço", async () => {
        const result = await useCase.execute("user-sem-endereco");

        expect(result).toEqual([]);
    });

    it("devolve o rótulo (label) de cada endereço", async () => {
        const address = Address.build(
            createId,
            "user-1",
            "João da Silva",
            "01310100",
            "Avenida Paulista",
            "1000",
            null,
            "Bela Vista",
            "São Paulo",
            "SP",
            "Trabalho"
        );
        await addressRepository.save(address);

        const result = await useCase.execute("user-1");

        expect(result[0].label).toBe("Trabalho");
    });
});
