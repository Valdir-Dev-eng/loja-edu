import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { User, UserRole } from "../../domain/entites/User";

export class UserRepository extends RepositoryPort<User> {
    constructor(protected readonly dataAccess: DataAccessPort) {
        super(dataAccess);
    }

    async save(entity: User): Promise<string | number | undefined> {
        return await this.dataAccess.create("users", {
            id: entity.id,
            email: entity.email,
            username: entity.username,
            full_name: entity.fullName,
            role: entity.role,
            onboarding_completed: entity.onboardingCompleted,
            document: entity.document,
        });
    }

    async findBy(query: FilterQuery<User>): Promise<User | null> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>("users", this.toColumnQuery(query));
        return data ? this.mapToEntity(data) : null;
    }

    async findMany(query: FilterQuery<User>): Promise<User[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>("users", this.toColumnQuery(query));
        return rows.map((row) => this.mapToEntity(row));
    }

    async findById(id: string): Promise<User | undefined> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>("users", { id } as never);
        return data ? this.mapToEntity(data) : undefined;
    }

    async findAll(): Promise<User[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>("users");
        return rows.map((row) => this.mapToEntity(row));
    }

    async findManyByIds(ids: string[]): Promise<User[]> {
        const rows = await this.dataAccess.findManyByField<Record<string, unknown>>("users", "id", ids);
        return rows.map((row) => this.mapToEntity(row));
    }

    async update(id: string, entity: Partial<User>): Promise<void> {
        await this.dataAccess.update("users", { id } as never, this.toColumnQuery(entity));
    }

    async exists(filter: Partial<User>): Promise<boolean> {
        return (await this.dataAccess.count("users", this.toColumnQuery(filter))) > 0;
    }

    async delete(id: string): Promise<number> {
        return await this.dataAccess.remove("users", { id });
    }

    async decrementFieldIfSufficient(id: string, field: keyof User & string, amount: number): Promise<boolean> {
        return this.dataAccess.decrementIfSufficient("users", id, field, amount);
    }

    async updateIfEqual(id: string, field: keyof User & string, expectedValue: unknown, data: Partial<User>): Promise<boolean> {
        return this.dataAccess.updateIfEqual("users", id, field, expectedValue, this.toColumnQuery(data));
    }

    async incrementField(id: string, field: keyof User & string, amount: number): Promise<void> {
        await this.dataAccess.incrementField("users", id, field, amount);
    }

    private toColumnQuery(entity: Partial<User>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        if (entity.id !== undefined) columns.id = entity.id;
        if (entity.email !== undefined) columns.email = entity.email;
        if (entity.username !== undefined) columns.username = entity.username;
        if (entity.fullName !== undefined) columns.full_name = entity.fullName;
        if (entity.role !== undefined) columns.role = entity.role;
        if (entity.onboardingCompleted !== undefined) columns.onboarding_completed = entity.onboardingCompleted;
        if (entity.document !== undefined) columns.document = entity.document;
        return columns;
    }

    private mapToEntity(data: Record<string, unknown>): User {
        return new User(
            data.id as string,
            data.email as string,
            data.username as string,
            (data.full_name as string | null) ?? null,
            (data.role as UserRole) ?? UserRole.CUSTOMER,
            (data.onboarding_completed as boolean) ?? false,
            (data.document as string | null) ?? null,
            data.created_at ? new Date(data.created_at as string) : new Date(),
            data.updated_at ? new Date(data.updated_at as string) : new Date(),
            data.deleted_at ? new Date(data.deleted_at as string) : null
        );
    }
}
