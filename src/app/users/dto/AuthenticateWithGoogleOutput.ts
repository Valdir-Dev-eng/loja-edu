export interface AuthenticateWithGoogleOutput {
    token: string;
    refreshToken: string;
    userId: string;
    onboardingPending: boolean;
}
