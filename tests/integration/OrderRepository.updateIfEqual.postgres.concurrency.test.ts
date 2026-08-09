import { afterEach, describe, expect, it } from "vitest";
import { Order, OrderStatus } from "../../src/domain/entites/Order";
import { PostgresDataAccess } from "../../src/infra/database/PostgresDataAccess";
import { AddressRepository } from "../../src/infra/repository/AddressRepository";
import { OrderRepository } from "../../src/infra/repository/OrderRepository";
import { ProductRepository } from "../../src/infra/repository/ProductRepository";
import { PostgresTestCleanup } from "./support/PostgresTestCleanup";

// PG_QUERY_TIMEOUT_MS default (3500ms) é dimensionado pra uma query NORMAL.
// Este teste é atípico de propósito (10 conexões reais competindo pelo lock
// de UMA linha) e por isso ganha um teto próprio, bem mais largo — a
// investigação abaixo é o porquê disso não ser "abafar o timeout".
//
// INVESTIGAÇÃO (rodando a suíte inteira em paralelo, que é quando a falha
// apareceu): medi o RTT puro contra o Supabase real fora do vitest, 20
// amostras de "SELECT 1" sem nenhuma disputa: p50=144ms, p90=264ms, mas 1
// em 20 amostras saltou pra 1448ms — jitter real do ambiente, não causado
// por concorrência. Depois instrumentei ESTE teste (10 chamadas reais,
// cronometradas individualmente) e o padrão nas 3 execuções foi sempre o
// mesmo: 1 chamada rápida (a vencedora, grava e commita), depois um
// AGRUPAMENTO de 6 a 8 chamadas terminando a poucos ms umas das outras, e 1
// última isolada mais lenta que o grupo. Esse agrupamento é a assinatura de
// "todas as perdedoras acordam juntas quando o lock é liberado pelo commit
// da vencedora" — NÃO uma fila crescendo linearmente (isso apareceria como
// degraus com espaçamento igual entre as 10, não um aglomerado). Ou seja: o
// tempo total escala com "1 commit real + 1 release em lote", não com N
// round-trips sequenciais — e o teto generoso aqui existe pra absorver o
// jitter real do ambiente (visto isolado, sem nenhuma disputa) somado a essa
// dinâmica de lote, não porque a concorrência em si degrade linearmente.
// Isolado por arquivo (worker/processo próprio do vitest, não vaza pro
// default usado pelo resto da aplicação).
process.env.PG_QUERY_TIMEOUT_MS = "20000";

// Prova de concorrência real (Postgres do projeto, não Fake) — o
// TestWithMemoryDataAcess prova que a use case não faz read-then-write, mas
// é atômico "de graça" por ser single-threaded. Isso aqui prova o mecanismo
// que realmente segura a corrida em produção: UPDATE...WHERE sob conexões
// concorrentes de verdade, disputando a MESMA linha na MESMA tabela.
describe("OrderRepository.updateIfEqual — prova de concorrência real (Postgres do projeto, não Fake)", () => {
    const db = new PostgresDataAccess();
    const repo = new OrderRepository(db);
    let createdOrderId: string | null = null;

    afterEach(async () => {
        await PostgresTestCleanup.hardDeleteOrderByIds([createdOrderId]);
        createdOrderId = null;
    });

    it("deixa exatamente um UPDATE concorrente vencer quando 10 conexões reais disputam a mesma linha", async () => {
        // user_id/address_id/produto_id tem FK de verdade nas tabelas reais —
        // usa registros que ja existem, em vez de uuid solto que violaria as
        // constraints.
        const [anyAddress] = await new AddressRepository(db).findAll();
        const [anyProduct] = await new ProductRepository(db).findAll();
        if (!anyAddress || !anyProduct) {
            throw new Error("Precisa de ao menos um endereço e um produto reais no banco para este teste rodar.");
        }

        const id = crypto.randomUUID();
        const order = Order.build(
            () => id,
            anyAddress.userId,
            anyAddress.id,
            [{ productId: anyProduct.id, productName: anyProduct.name, priceCents: 1000, quantity: 1 }],
            0
        );
        await repo.save(order);
        createdOrderId = order.id;

        const concurrentCalls = 10;
        const results = await Promise.all(
            Array.from({ length: concurrentCalls }, () =>
                repo.updateIfEqual(order.id, "status", OrderStatus.PENDING_PAYMENT, { status: OrderStatus.PAID })
            )
        );

        const wins = results.filter(Boolean).length;
        expect(wins).toBe(1);

        const persisted = await repo.findById(order.id);
        expect(persisted!.status).toBe(OrderStatus.PAID);
    }, 25_000);
});
