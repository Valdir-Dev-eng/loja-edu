import { AuthenticateWithGoogleOutput } from "../../app/users/dto/AuthenticateWithGoogleOutput";
import { CompleteOnboardingOutput } from "../../app/users/dto/CompleteOnboardingOutput";
import { RefreshSessionOutput } from "../../app/users/dto/RefreshSessionOutput";
import { UserOutput } from "../../app/users/dto/UserOutput";
import { AuthenticateWithGoogle } from "../../app/users/useCase/AuthenticateWithGoogle";
import { CompleteOnboarding } from "../../app/users/useCase/CompleteOnboarding";
import { GetAuthenticatedUser } from "../../app/users/useCase/GetAuthenticatedUser";
import { LogoutUser } from "../../app/users/useCase/LogoutUser";
import { RefreshSession } from "../../app/users/useCase/RefreshSession";
import { OnboardingData } from "../validators/UserValidator";

export class UserAuthController {
    constructor(
        private authenticateWithGoogle: AuthenticateWithGoogle,
        private completeOnboardingUseCase: CompleteOnboarding,
        private logoutUser: LogoutUser,
        private getAuthenticatedUser: GetAuthenticatedUser,
        private refreshSessionUseCase: RefreshSession
    ) {}

    async authenticateWithGoogleCode(code: string, redirectUri: string): Promise<AuthenticateWithGoogleOutput> {
        return await this.authenticateWithGoogle.execute({ code, redirectUri });
    }

    async resolveAuthenticatedUser(token: string): Promise<UserOutput> {
        return await this.getAuthenticatedUser.execute({ token });
    }

    async completeOnboarding(userId: string, data: OnboardingData): Promise<CompleteOnboardingOutput> {
        return await this.completeOnboardingUseCase.execute({
            userId,
            fullName: data.fullName,
            document: data.document,
            addresses: data.addresses,
        });
    }

    async refreshSession(refreshToken: string): Promise<RefreshSessionOutput> {
        return await this.refreshSessionUseCase.execute({ refreshToken });
    }

    async logout(token: string, refreshToken?: string): Promise<void> {
        await this.logoutUser.execute({ token, refreshToken });
    }
}
