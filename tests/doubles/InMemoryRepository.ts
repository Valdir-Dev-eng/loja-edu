import { DataAccessPort } from "../../src/domain/database/DataAcess";
import { FilterQuery, RepositoryPort } from "../../src/domain/repository/RepositoryPort";

export class InMemoryRepository<T extends { id: string }> extends RepositoryPort<T> {
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
        const found = Array.from(this.items.values()).find((item) => this.matches(item, query));
        return found ?? null;
    }

    async findMany(query: FilterQuery<T>): Promise<T[]> {
        return Array.from(this.items.values()).filter((item) => this.matches(item, query));
    }

    async exists(filter: Partial<T>): Promise<boolean> {
        return Array.from(this.items.values()).some((item) => this.matches(item, filter));
    }

    async delete(id: string): Promise<number> {
        return this.items.delete(id) ? 1 : 0;
    }

    private matches(item: T, query: Partial<T>): boolean {
        return Object.entries(query).every(([key, value]) => (item as Record<string, unknown>)[key] === value);
    }
}
