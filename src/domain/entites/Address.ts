import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

const ZIP_CODE_PATTERN = /^\d{8}$/;
const STATE_PATTERN = /^[A-Z]{2}$/;

export class Address {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public recipientName: string,
        public zipCode: string,
        public street: string,
        public number: string,
        public complement: string | null,
        public neighborhood: string,
        public city: string,
        public state: string,
        public label: string,
        public readonly created_at: Date = new Date(),
        public updated_at: Date = new Date(),
        public _deleted_at: Date | null = null
    ) {}

    get deleted_at(): Date | null {
        return this._deleted_at;
    }

    static build(
        createId: CreateId,
        userId: string,
        recipientName: string,
        zipCode: string,
        street: string,
        number: string,
        complement: string | null,
        neighborhood: string,
        city: string,
        state: string,
        label: string
    ): Address {
        if (!ZIP_CODE_PATTERN.test(zipCode)) {
            throw new BusinessRuleError("CEP inválido.");
        }
        if (!STATE_PATTERN.test(state)) {
            throw new BusinessRuleError("UF inválida.");
        }
        if (!recipientName || recipientName.trim().length === 0) {
            throw new BusinessRuleError("Nome do destinatário é obrigatório.");
        }
        if (!label || label.trim().length === 0) {
            throw new BusinessRuleError("Identificação do endereço é obrigatória.");
        }
        return new Address(
            createId(),
            userId,
            recipientName,
            zipCode,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            label
        );
    }

    softDelete(): void {
        if (this._deleted_at) {
            throw new ConflictError("Endereço já está deletado.");
        }
        this._deleted_at = new Date();
    }
}
