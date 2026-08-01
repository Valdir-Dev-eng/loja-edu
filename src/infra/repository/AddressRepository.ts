import { FilterQuery, RepositoryPort } from "../../domain/repository/RepositoryPort";
import { DataAccessPort } from "../../domain/database/DataAcess";
import { Address } from "../../domain/entites/Address";

export class AddressRepository extends RepositoryPort<Address> {
    constructor(protected readonly dataAccess: DataAccessPort) {
        super(dataAccess);
    }

    async save(entity: Address): Promise<string | number | undefined> {
        return await this.dataAccess.create("enderecos", {
            id: entity.id,
            user_id: entity.userId,
            recipient_name: entity.recipientName,
            zip_code: entity.zipCode,
            street: entity.street,
            number: entity.number,
            complement: entity.complement,
            neighborhood: entity.neighborhood,
            city: entity.city,
            state: entity.state,
            label: entity.label,
        });
    }

    async findBy(query: FilterQuery<Address>): Promise<Address | null> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>("enderecos", this.toColumnQuery(query));
        return data ? this.mapToEntity(data) : null;
    }

    async findMany(query: FilterQuery<Address>): Promise<Address[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>("enderecos", this.toColumnQuery(query));
        return rows.map((row) => this.mapToEntity(row));
    }

    async findById(id: string): Promise<Address | undefined> {
        const data = await this.dataAccess.findOne<Record<string, unknown>>("enderecos", { id } as never);
        return data ? this.mapToEntity(data) : undefined;
    }

    async findAll(): Promise<Address[]> {
        const rows = await this.dataAccess.findMany<Record<string, unknown>>("enderecos");
        return rows.map((row) => this.mapToEntity(row));
    }

    async update(id: string, entity: Partial<Address>): Promise<void> {
        await this.dataAccess.update("enderecos", { id } as never, this.toColumnQuery(entity));
    }

    async exists(filter: Partial<Address>): Promise<boolean> {
        return (await this.dataAccess.count("enderecos", this.toColumnQuery(filter))) > 0;
    }

    async delete(id: string): Promise<number> {
        return await this.dataAccess.remove("enderecos", { id });
    }

    private toColumnQuery(entity: Partial<Address>): Record<string, unknown> {
        const columns: Record<string, unknown> = {};
        if (entity.id !== undefined) columns.id = entity.id;
        if (entity.userId !== undefined) columns.user_id = entity.userId;
        if (entity.recipientName !== undefined) columns.recipient_name = entity.recipientName;
        if (entity.zipCode !== undefined) columns.zip_code = entity.zipCode;
        if (entity.street !== undefined) columns.street = entity.street;
        if (entity.number !== undefined) columns.number = entity.number;
        if (entity.complement !== undefined) columns.complement = entity.complement;
        if (entity.neighborhood !== undefined) columns.neighborhood = entity.neighborhood;
        if (entity.city !== undefined) columns.city = entity.city;
        if (entity.state !== undefined) columns.state = entity.state;
        if (entity.label !== undefined) columns.label = entity.label;
        return columns;
    }

    private mapToEntity(data: Record<string, unknown>): Address {
        return new Address(
            data.id as string,
            data.user_id as string,
            data.recipient_name as string,
            data.zip_code as string,
            data.street as string,
            data.number as string,
            (data.complement as string | null) ?? null,
            data.neighborhood as string,
            data.city as string,
            data.state as string,
            data.label as string,
            data.created_at ? new Date(data.created_at as string) : new Date(),
            data.updated_at ? new Date(data.updated_at as string) : new Date(),
            data.deleted_at ? new Date(data.deleted_at as string) : null
        );
    }
}
