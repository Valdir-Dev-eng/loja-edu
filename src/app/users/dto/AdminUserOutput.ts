import { UserRole } from "../../../domain/entites/User";

export interface AdminUserOutput {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    onboardingCompleted: boolean;
}
