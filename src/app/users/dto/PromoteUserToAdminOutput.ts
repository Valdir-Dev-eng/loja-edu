import { UserRole } from "../../../domain/entites/User";

export interface PromoteUserToAdminOutput {
    id: string;
    role: UserRole;
}
