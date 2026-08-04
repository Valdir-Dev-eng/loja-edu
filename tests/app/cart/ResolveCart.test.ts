import { beforeEach, describe, expect, it } from "vitest";
import { ResolveCart } from "../../../src/app/cart/useCase/ResolveCart";
import { Cart } from "../../../src/domain/entites/Cart";
import { InMemoryRepository } from "../../doubles/InMemoryRepository";

let sequence = 0;
const createId = () => `cart-id-${++sequence}`;

const buildUseCase = () => {
    const cartRepo = new InMemoryRepository<Cart>();
    const useCase = new ResolveCart(cartRepo, createId);
    return { useCase, cartRepo };
};

describe("ResolveCart", () => {
    let context: ReturnType<typeof buildUseCase>;

    beforeEach(() => {
        context = buildUseCase();
    });

    it("cria um carrinho anônimo novo quando não há cookie nenhum", async () => {
        const cart = await context.useCase.execute({ cartIdFromCookie: null, userId: null, createIfMissing: true });

        expect(cart).not.toBeNull();
        expect(cart!.userId).toBeNull();
    });

    it("devolve null (sem criar nada) quando não há cookie e createIfMissing é false — usado no GET pra não gerar linha à toa", async () => {
        const cart = await context.useCase.execute({ cartIdFromCookie: null, userId: null, createIfMissing: false });

        expect(cart).toBeNull();
        expect(await context.cartRepo.findAll()).toHaveLength(0);
    });

    it("reaproveita o carrinho anônimo do cookie quando ele existe e não tem dono", async () => {
        const existing = Cart.build(createId);
        await context.cartRepo.save(existing);

        const cart = await context.useCase.execute({ cartIdFromCookie: existing.id, userId: null, createIfMissing: true });

        expect(cart!.id).toBe(existing.id);
    });

    it("reaproveita o próprio carrinho quando o cookie aponta pro carrinho do usuário logado", async () => {
        const existing = Cart.build(createId);
        existing.attachUser("user-1");
        await context.cartRepo.save(existing);

        const cart = await context.useCase.execute({ cartIdFromCookie: existing.id, userId: "user-1", createIfMissing: true });

        expect(cart!.id).toBe(existing.id);
    });

    it("MENTE MALICIOSA: nunca reaproveita o carrinho de outro usuário, mesmo com o cookie apontando exatamente pro id dele", async () => {
        const victimCart = Cart.build(createId);
        victimCart.attachUser("vitima");
        await context.cartRepo.save(victimCart);

        // atacante nao esta logado, so colocou o cookie do carrinho da vitima
        const asAnonymous = await context.useCase.execute({
            cartIdFromCookie: victimCart.id,
            userId: null,
            createIfMissing: true,
        });
        expect(asAnonymous!.id).not.toBe(victimCart.id);
        expect(asAnonymous!.userId).toBeNull();

        // atacante esta logado como outra pessoa e tambem tenta usar o cookie da vitima
        const asOtherUser = await context.useCase.execute({
            cartIdFromCookie: victimCart.id,
            userId: "atacante",
            createIfMissing: true,
        });
        expect(asOtherUser!.id).not.toBe(victimCart.id);
        expect(asOtherUser!.userId).toBe("atacante");
    });

    it("usuário logado sem cookie de carrinho, mas que já tem carrinho salvo, recupera o carrinho salvo (não cria um segundo)", async () => {
        const existing = Cart.build(createId);
        existing.attachUser("user-1");
        await context.cartRepo.save(existing);

        const cart = await context.useCase.execute({ cartIdFromCookie: null, userId: "user-1", createIfMissing: true });

        expect(cart!.id).toBe(existing.id);
        expect(await context.cartRepo.findAll()).toHaveLength(1);
    });

    it("associa o carrinho ao usuário na hora de criar, quando ele já está logado e nunca teve carrinho", async () => {
        const cart = await context.useCase.execute({ cartIdFromCookie: null, userId: "user-1", createIfMissing: true });

        expect(cart!.userId).toBe("user-1");
    });

    it("cookie de carrinho já deletado é ignorado, cria um novo em vez de reaproveitar lixo", async () => {
        const deleted = Cart.build(createId);
        deleted.softDelete();
        await context.cartRepo.save(deleted);

        const cart = await context.useCase.execute({ cartIdFromCookie: deleted.id, userId: null, createIfMissing: true });

        expect(cart!.id).not.toBe(deleted.id);
    });

    it("cookie apontando pra um id de carrinho que nunca existiu é ignorado, sem erro", async () => {
        const cart = await context.useCase.execute({
            cartIdFromCookie: "carrinho-que-nunca-existiu",
            userId: null,
            createIfMissing: true,
        });

        expect(cart).not.toBeNull();
        expect(cart!.id).not.toBe("carrinho-que-nunca-existiu");
    });
});
