import { DataAccessPort } from "../../src/domain/database/DataAcess";
import { FilterQuery, RepositoryPort } from "../../src/domain/repository/RepositoryPort";

export class InMemoryRepository<T extends { id: string; deleted_at: Date | null }> extends RepositoryPort<T> {
    private items: Map<string, T> = new Map();

    constructor() {
        super(undefined as unknown as DataAccessPort);
    }

    async save(entity: T): Promise<string> {
        this.items.set(entity.id, entity);
        return entity.id;
    }

    async findById(id: string): Promise<T | undefined> {
        return this.items.get(id);
    }

    async findAll(): Promise<T[]> {
        return Array.from(this.items.values());
    }

    async findManyByIds(ids: string[]): Promise<T[]> {
        const idSet = new Set(ids);
        return Array.from(this.items.values()).filter((item) => idSet.has(item.id));
    }

    async update(id: string, entity: Partial<T>): Promise<void> {
        const current = this.items.get(id);
        if (!current) return;
        Object.keys(entity as object).forEach((key) =>
            this.assignIfWritable(current, key, (entity as Record<string, unknown>)[key])
        );
    }

    private assignIfWritable(target: T, key: string, value: unknown): void {
        try {
            (target as unknown as Record<string, unknown>)[key] = value;
        } catch {
            return;
        }
    }

    async findBy(query: FilterQuery<T>): Promise<T | null> {
        const found = Array.from(this.items.values()).find((item) => this.notDeleted(item) && this.matches(item, query));
        return found ?? null;
    }

    async findByIncludingDeleted(query: FilterQuery<T>): Promise<T | null> {
        const found = Array.from(this.items.values()).find((item) => this.matches(item, query));
        return found ?? null;
    }

    async findMany(query: FilterQuery<T>): Promise<T[]> {
        return Array.from(this.items.values()).filter((item) => this.notDeleted(item) && this.matches(item, query));
    }

    async exists(filter: Partial<T>): Promise<boolean> {
        return Array.from(this.items.values()).some((item) => this.matches(item, filter));
    }

    async delete(id: string): Promise<number> {
        return this.items.delete(id) ? 1 : 0;
    }

    async decrementFieldIfSufficient(id: string, field: keyof T & string, amount: number): Promise<boolean> {
        const item = this.items.get(id);
        if (!item) return false;
        const currentValue = item[field] as unknown as number;
        if (typeof currentValue !== "number" || currentValue < amount) {
            return false;
        }
        (item[field] as unknown as number) = currentValue - amount;
        return true;
    }

    async updateIfEqual(id: string, field: keyof T & string, expectedValue: unknown, data: Partial<T>): Promise<boolean> {
        const item = this.items.get(id);
        if (!item || item[field] !== expectedValue) {
            return false;
        }
        Object.assign(item as object, data);
        return true;
    }

    async incrementField(id: string, field: keyof T & string, amount: number): Promise<void> {
        const item = this.items.get(id);
        if (!item) return;
        const currentValue = item[field] as unknown as number;
        (item[field] as unknown as number) = (typeof currentValue === "number" ? currentValue : 0) + amount;
    }

    // Fake sem conexao/pool de verdade — nao ha isolamento de transacao pra
    // simular. O withTransaction generico da base assume um construtor
    // (dataAccess: DataAccessPort), que este double nao tem (e' niladico);
    // chamar aquele por acidente criaria um Map novo e vazio, silenciosamente
    // desconectado do original. Sobrescreve pra devolver a si mesma.
    withTransaction(): this {
        return this;
    }

    private matches(item: T, query: Partial<T>): boolean {
        return Object.entries(query).every(([key, value]) => (item as Record<string, unknown>)[key] === value);
    }

    private notDeleted(item: T): boolean {
        return item.deleted_at === null;
    }
}
