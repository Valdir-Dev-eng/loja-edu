import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { MelhorEnvioConnection } from "../../domain/entites/MelhorEnvioConnection";

export class MelhorEnvioConnectionRepository extends RepositoryPort<MelhorEnvioConnection> {
    private readonly collectionName = "melhor_envio_connections";

    constructor(protected readonly dataAccess: DataAccessPort) {
        super(dataAccess);
    }

    async save(entity: MelhorEnvioConnection): Promise<string | number | undefined> {
        return await this.dataAccess.create(this.collectionName, {
            id: entity.id,
            access_token: entity.accessToken,
            refresh_token: entity.refreshToken,
            expires_at: entity.expiresAt,
        });
    }

    async findById(id: string): Promise<MelhorEnvioConnection | undefined> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, { id } as never);
        return data ? this.mapToEntity(data) : undefined;
    }

    async findBy(query: FilterQuery<MelhorEnvioConnection>): Promise<MelhorEnvioConnection | null> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return data ? this.mapToEntity(data) : null;
    }

    async findMany(query: FilterQuery<MelhorEnvioConnection>): Promise<MelhorEnvioConnection[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName, this.toColumnQuery(query));
        return rows.map((row) => this.mapToEntity(row));
    }

    async findAll(): Promise<MelhorEnvioConnection[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>(this.collectionName);
        return rows.map((row) => this.mapToEntity(row));
    }

    async findManyByIds(ids: string[]): Promise<MelhorEnvioConnection[]> {
        const rows = await this.dataAccess.findManyByField<Record<string, unknown>>(this.collectionName, "id", ids);
        return rows.map((row) => this.mapToEntity(row));
    }

    async exists(filter: Partial<MelhorEnvioConnection>): Promise<boolean> {
        return (await this.dataAccess.count(this.collectionName, this.toColumnQuery(filter))) > 0;
    }

    async update(id: string, entity: Partial<MelhorEnvioConnection>): Promise<void> {
        await this.dataAccess.update(this.collectionName, { id } as never, this.toColumnQuery(entity));
    }

    async delete(id: string): Promise<number> {
        return await this.dataAccess.remove(this.collectionName, { id });
    }

    async decrementFieldIfSufficient(
        id: string,
        field: keyof MelhorEnvioConnection & string,
        amount: number
    ): Promise<boolean> {
        return this.dataAccess.decrementIfSufficient(this.collectionName, id, field, amount);
    }

    private toColumnQuery(entity: Partial<MelhorEnvioConnection>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        if (entity.id !== undefined) columns.id = entity.id;
        if (entity.accessToken !== undefined) columns.access_token = entity.accessToken;
        if (entity.refreshToken !== undefined) columns.refresh_token = entity.refreshToken;
        if (entity.expiresAt !== undefined) columns.expires_at = entity.expiresAt;
        if (entity.deleted_at !== undefined) columns.deleted_at = entity.deleted_at;
        return columns;
    }

    private mapToEntity(data: Record<string, unknown>): MelhorEnvioConnection {
        return new MelhorEnvioConnection(
            data.id as string,
            data.access_token as string,
            data.refresh_token as string,
            new Date(data.expires_at as string),
            data.updated_at ? new Date(data.updated_at as string) : new Date(),
            data.deleted_at ? new Date(data.deleted_at as string) : null
        );
    }
}
