import postgres from "postgres";
import { ConfigDb } from "../../../src/infra/config/ConfigDb";

export class PostgresTestCleanup {
    private static readonly sql = postgres(ConfigDb.getDb(), { ssl: { rejectUnauthorized: false } });

    static async hardDeleteUsersByIds(ids: readonly (string | null)[]): Promise<void> {
        const realIds = ids.filter((id): id is string => Boolean(id));
        if (realIds.length === 0) return;
        await this.sql`DELETE FROM users WHERE id IN ${this.sql(realIds)}`;
    }

    static async purgeStaleUsersByEmailPattern(pattern: string): Promise<number> {
        const result = await this.sql`DELETE FROM users WHERE email LIKE ${pattern}`;
        return result.count;
    }

    static async hardDeleteOrderByIds(ids: readonly (string | null)[]): Promise<void> {
        const realIds = ids.filter((id): id is string => Boolean(id));
        if (realIds.length === 0) return;
        await this.sql`DELETE FROM itens_pedido WHERE pedido_id IN ${this.sql(realIds)}`;
        await this.sql`DELETE FROM pedidos WHERE id IN ${this.sql(realIds)}`;
    }
}
