export interface UserOutput {
    id: string;
    email: string;
    username: string;
    fullName: string | null;
    onboardingCompleted: boolean;
    isAdmin: boolean;
}
