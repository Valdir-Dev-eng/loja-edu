import { BusinessRuleError } from "../errors/BusinessRuleError";
import { ConflictError } from "../errors/ConflictError";
import { CreateId } from "../interface/CreateId";

const DIACRITIC_MARKS_PATTERN = new RegExp(String.fromCharCode(91, 0x0300, 45, 0x036f, 93), "g");
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]/g;

export const UserRole = {
    CUSTOMER: "CUSTOMER",
    ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export class User {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly username: string,
        public fullName: string | null,
        public role: UserRole = UserRole.CUSTOMER,
        private _onboardingCompleted: boolean = false,
        public document: string | null = null,
        public readonly created_at: Date = new Date(),
        public updated_at: Date = new Date(),
        public _deleted_at: Date | null = null
    ) {}

    get deleted_at(): Date | null {
        return this._deleted_at;
    }

    get onboardingCompleted(): boolean {
        return this._onboardingCompleted;
    }

    static build(createId: CreateId, email: string, username: string): User {
        if (!email.includes("@") || email.length < 5) {
            throw new BusinessRuleError("E-mail inválido.");
        }
        if (!username || username.trim().length === 0) {
            throw new BusinessRuleError("Nome de usuário inválido.");
        }
        return new User(createId(), email, username, null, UserRole.CUSTOMER, false, null);
    }

    static sanitizeEmailLocalPart(email: string): string {
        const localPart = email.split("@")[0] ?? "";
        const withoutAccents = localPart.normalize("NFD").replace(DIACRITIC_MARKS_PATTERN, "");
        const cleaned = withoutAccents.toLowerCase().replace(NON_ALPHANUMERIC_PATTERN, "");
        return cleaned.length > 0 ? cleaned : "usuario";
    }

    static buildUsernameCandidate(base: string, attempt: number): string {
        return attempt === 0 ? base : `${base}${attempt + 1}`;
    }

    completeOnboarding(fullName: string, addressesCount: number, document: string): void {
        if (this._onboardingCompleted) {
            throw new ConflictError("Onboarding já foi concluído.");
        }
        if (!fullName || fullName.trim().length === 0) {
            throw new BusinessRuleError("Nome completo é obrigatório.");
        }
        if (addressesCount < 1) {
            throw new BusinessRuleError("É necessário cadastrar ao menos um endereço.");
        }
        const digitsOnlyDocument = document.replace(/\D/g, "");
        if (digitsOnlyDocument.length !== 11 && digitsOnlyDocument.length !== 14) {
            throw new BusinessRuleError("CPF ou CNPJ inválido.");
        }
        this.fullName = fullName.trim();
        this.document = digitsOnlyDocument;
        this._onboardingCompleted = true;
        this.updated_at = new Date();
    }

    isAdmin(): boolean {
        return this.role === UserRole.ADMIN;
    }

    promoteToAdmin(): void {
        if (this.role === UserRole.ADMIN) {
            throw new ConflictError("Usuário já é administrador.");
        }
        this.role = UserRole.ADMIN;
        this.updated_at = new Date();
    }

    softDelete(): void {
        if (this._deleted_at) {
            throw new ConflictError("Usuário já está deletado.");
        }
        this._deleted_at = new Date();
    }
}
