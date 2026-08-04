import { Cart } from "../../../domain/entites/Cart";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";

export interface ResolveCartInput {
    /** Vem só do cookie da requisição — nunca de corpo/query (nunca confiar num id de carrinho que o cliente possa forjar em JSON). */
    cartIdFromCookie: string | null;
    userId: string | null;
    createIfMissing: boolean;
}

export class ResolveCart {
    constructor(
        private cartRepo: RepositoryPort<Cart>,
        private createId: CreateId
    ) {}

    async execute(input: ResolveCartInput): Promise<Cart | null> {
        if (input.cartIdFromCookie) {
            const existing = await this.cartRepo.findById(input.cartIdFromCookie);
            // Carrinho existe, não foi deletado, e (é anônimo OU já é do usuário atual).
            // Se pertence a outro usuário, cai pro fallback abaixo — nunca reaproveita
            // nem revela o carrinho de outra pessoa, mesmo que o cookie aponte pra ele.
            if (existing && !existing.deleted_at && existing.belongsTo(input.userId)) {
                return existing;
            }
        }

        if (input.userId) {
            const existingForUser = await this.cartRepo.findBy({ userId: input.userId } as never);
            if (existingForUser && !existingForUser.deleted_at) {
                return existingForUser;
            }
        }

        if (!input.createIfMissing) {
            return null;
        }

        const cart = Cart.build(this.createId);
        if (input.userId) {
            cart.attachUser(input.userId);
        }
        await this.cartRepo.save(cart);
        return cart;
    }
}
