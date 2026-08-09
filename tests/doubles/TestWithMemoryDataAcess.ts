import { DataAccessPort } from "../../src/domain/database/DataAcess";

type Row = Record<string, any>;

export class TestWithMemoryDataAcess extends DataAccessPort {
    private readonly tables = new Map<string, Row[]>();
    private readonly maxDelayMs: number;
    private readonly callCounts = new Map<string, number>();
    private readonly pendingFailures = new Map<string, number>();

    constructor(maxDelayMs = 3) {
        super();
        this.maxDelayMs = maxDelayMs;
    }

    callsTo(collectionName: string, method: string): number {
        return this.callCounts.get(`${method}:${collectionName}`) ?? 0;
    }

    // Injeta falha determinística nas próximas `times` chamadas de `method`
    // sobre `collectionName` — pra testar caminho de rollback sem depender
    // de uma condição de corrida acontecer sozinha.
    failNextCallTo(collectionName: string, method: string, times = 1): void {
        this.pendingFailures.set(`${method}:${collectionName}`, times);
    }

    private countCall(collectionName: string, method: string): void {
        const key = `${method}:${collectionName}`;
        this.callCounts.set(key, (this.callCounts.get(key) ?? 0) + 1);
    }

    private maybeFail(collectionName: string, method: string): void {
        const key = `${method}:${collectionName}`;
        const remaining = this.pendingFailures.get(key);
        if (remaining && remaining > 0) {
            this.pendingFailures.set(key, remaining - 1);
            throw new Error(`Falha simulada injetada em ${key}`);
        }
    }

    private table(collectionName: string): Row[] {
        const existing = this.tables.get(collectionName);
        if (existing) {
            return existing;
        }
        const created: Row[] = [];
        this.tables.set(collectionName, created);
        return created;
    }

    private async yieldToEventLoop(): Promise<void> {
        const delay = this.maxDelayMs > 0 ? Math.random() * this.maxDelayMs : 0;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    private matches(row: Row, query: Row): boolean {
        return Object.entries(query).every(([key, value]) => row[key] === value);
    }

    private notDeleted(row: Row): boolean {
        return row.deleted_at === null || row.deleted_at === undefined;
    }

    private project<T extends object>(row: Row, selectFields?: (keyof T)[]): T {
        if (!selectFields || selectFields.length === 0) {
            return { ...row } as T;
        }
        const projected: Row = {};
        for (const field of selectFields) {
            projected[field as string] = row[field as string];
        }
        return projected as T;
    }

    async findMany<T extends object>(
        collectionName: string,
        query?: Partial<T>,
        selectFields?: (keyof T)[]
    ): Promise<T[]> {
        this.countCall(collectionName, "findMany");
        await this.yieldToEventLoop();
        const filter = (query as Row) ?? {};
        return this.table(collectionName)
            .filter((row) => this.notDeleted(row) && this.matches(row, filter))
            .map((row) => this.project<T>(row, selectFields));
    }

    async findManyByField<T extends object>(
        collectionName: string,
        field: string,
        values: readonly (string | number)[]
    ): Promise<T[]> {
        this.countCall(collectionName, "findManyByField");
        await this.yieldToEventLoop();
        if (values.length === 0) {
            return [];
        }
        const valueSet = new Set(values);
        return this.table(collectionName)
            .filter((row) => this.notDeleted(row) && valueSet.has(row[field]))
            .map((row) => ({ ...row } as T));
    }

    async findOne<T extends object>(
        collectionName: string,
        query: Partial<T>,
        selectFields?: (keyof T)[]
    ): Promise<T | undefined> {
        this.countCall(collectionName, "findOne");
        await this.yieldToEventLoop();
        const row = this.table(collectionName).find(
            (candidate) => this.notDeleted(candidate) && this.matches(candidate, query as Row)
        );
        return row ? this.project<T>(row, selectFields) : undefined;
    }

    async findBy<T extends object>(query: Partial<T>): Promise<T | null> {
        const result = await this.findOne<T>("users", query);
        return result ?? null;
    }

    async findOneIncludingDeleted<T extends object>(collectionName: string, query: Partial<T>): Promise<T | undefined> {
        this.countCall(collectionName, "findOneIncludingDeleted");
        await this.yieldToEventLoop();
        const row = this.table(collectionName).find((candidate) => this.matches(candidate, query as Row));
        return row ? this.project<T>(row) : undefined;
    }

    async create<T extends object>(collectionName: string, data: Partial<T>): Promise<string | number | undefined> {
        this.countCall(collectionName, "create");
        await this.yieldToEventLoop();
        const now = new Date().toISOString();
        const row: Row = { created_at: now, updated_at: now, deleted_at: null, ...(data as Row) };
        this.table(collectionName).push(row);
        return row.id;
    }

    async update<T extends object>(collectionName: string, query: Partial<T>, data: Partial<T>): Promise<number> {
        this.countCall(collectionName, "update");
        await this.yieldToEventLoop();
        const matching = this.table(collectionName).filter(
            (row) => this.notDeleted(row) && this.matches(row, query as Row)
        );
        for (const row of matching) {
            Object.assign(row, data, { updated_at: new Date().toISOString() });
        }
        return matching.length;
    }

    async remove(collectionName: string, query: Partial<any>): Promise<number> {
        await this.yieldToEventLoop();
        const matching = this.table(collectionName).filter(
            (row) => this.notDeleted(row) && this.matches(row, query as Row)
        );
        for (const row of matching) {
            row.deleted_at = new Date().toISOString();
        }
        return matching.length;
    }

    async count<T extends object>(collectionName: string, query: Partial<T>): Promise<number> {
        await this.yieldToEventLoop();
        return this.table(collectionName).filter(
            (row) => this.notDeleted(row) && this.matches(row, query as Row)
        ).length;
    }

    async decrementIfSufficient(collectionName: string, id: string, field: string, amount: number): Promise<boolean> {
        this.countCall(collectionName, "decrementIfSufficient");
        await this.yieldToEventLoop();
        // A partir daqui, sem nenhum outro await: igual a um UPDATE...WHERE
        // atomico no Postgres real, nenhuma outra chamada concorrente pode
        // intercalar entre a checagem e a escrita (single-threaded event loop).
        const row = this.table(collectionName).find((candidate) => this.notDeleted(candidate) && candidate.id === id);
        if (!row || row[field] < amount) {
            return false;
        }
        row[field] -= amount;
        row.updated_at = new Date().toISOString();
        return true;
    }

    async updateIfEqual<T extends object>(
        collectionName: string,
        id: string,
        field: string,
        expectedValue: unknown,
        data: Partial<T>
    ): Promise<boolean> {
        this.countCall(collectionName, "updateIfEqual");
        await this.yieldToEventLoop();
        // Mesma disciplina do decrementIfSufficient: zero await entre a
        // checagem do valor esperado e a escrita — atomico como um
        // UPDATE...WHERE real, nao um CAS otimista que pode perder a corrida.
        const row = this.table(collectionName).find((candidate) => this.notDeleted(candidate) && candidate.id === id);
        if (!row || row[field] !== expectedValue) {
            return false;
        }
        Object.assign(row, data, { updated_at: new Date().toISOString() });
        return true;
    }

    async incrementField(collectionName: string, id: string, field: string, amount: number): Promise<void> {
        this.countCall(collectionName, "incrementField");
        this.maybeFail(collectionName, "incrementField");
        await this.yieldToEventLoop();
        const row = this.table(collectionName).find((candidate) => this.notDeleted(candidate) && candidate.id === id);
        if (row) {
            row[field] = (row[field] ?? 0) + amount;
            row.updated_at = new Date().toISOString();
        }
    }

    async transaction<T>(callback: (tx: DataAccessPort) => Promise<T>): Promise<T> {
        // Snapshot raso das tabelas antes de rodar o callback — se ele
        // lancar, restaura tudo, simulando o rollback real do sql.begin()
        // do Postgres. O "tx" aqui e' a propria instancia: nao ha isolamento
        // de conexao pra fingir num fake single-threaded.
        const snapshot = new Map<string, Row[]>();
        for (const [name, rows] of this.tables) {
            snapshot.set(name, rows.map((row) => ({ ...row })));
        }
        try {
            return await callback(this);
        } catch (error) {
            this.tables.clear();
            for (const [name, rows] of snapshot) {
                this.tables.set(name, rows);
            }
            throw error;
        }
    }
}
