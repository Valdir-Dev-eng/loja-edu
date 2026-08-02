import { DataAccessPort } from "../../src/domain/database/DataAcess";

type Row = Record<string, any>;

export class TestWithMemoryDataAcess extends DataAccessPort {
    private readonly tables = new Map<string, Row[]>();
    private readonly maxDelayMs: number;
    private readonly callCounts = new Map<string, number>();

    constructor(maxDelayMs = 3) {
        super();
        this.maxDelayMs = maxDelayMs;
    }

    callsTo(collectionName: string, method: string): number {
        return this.callCounts.get(`${method}:${collectionName}`) ?? 0;
    }

    private countCall(collectionName: string, method: string): void {
        const key = `${method}:${collectionName}`;
        this.callCounts.set(key, (this.callCounts.get(key) ?? 0) + 1);
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
}
