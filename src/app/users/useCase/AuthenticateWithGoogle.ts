import { User } from "../../../domain/entites/User";
import { ForbiddenError } from "../../../domain/errors/ForbiddenError";
import { CreateId } from "../../../domain/interface/CreateId";
import { RepositoryPort } from "../../../domain/repository/RepositoryPort";
import { OAuthProviderPort } from "../../../domain/security/OAuthProviderPort";
import { ServiceAuthToken } from "../../../infra/security/ServiceAuthToken";
import { AuthenticateWithGoogleInput } from "../dto/AuthenticateWithGoogleInput";
import { AuthenticateWithGoogleOutput } from "../dto/AuthenticateWithGoogleOutput";

export class AuthenticateWithGoogle {
    constructor(
        private oauthProvider: OAuthProviderPort,
        private userRepository: RepositoryPort<User>,
        private createId: CreateId,
        private serviceAuthToken: ServiceAuthToken
    ) {}

    async execute(input: AuthenticateWithGoogleInput): Promise<AuthenticateWithGoogleOutput> {
        const verifiedEmail = await this.oauthProvider.exchangeCodeForVerifiedEmail(input.code, input.redirectUri);
        const user = await this.findOrCreateUser(verifiedEmail);
        const token = this.serviceAuthToken.generateToken({ id: user.id });
        return { token, onboardingPending: !user.onboardingCompleted };
    }

    private async findOrCreateUser(verifiedEmail: string): Promise<User> {
        const existingUser = await this.userRepository.findBy({ email: verifiedEmail });
        if (existingUser) {
            if (existingUser.deleted_at) {
                throw new ForbiddenError("Conta desativada.");
            }
            return existingUser;
        }

        const username = await this.resolveAvailableUsername(User.sanitizeEmailLocalPart(verifiedEmail));
        const user = User.build(this.createId, verifiedEmail, username);
        await this.userRepository.save(user);
        return user;
    }

    private async resolveAvailableUsername(base: string): Promise<string> {
        let attempt = 0;
        let candidate = User.buildUsernameCandidate(base, attempt);
        while (await this.userRepository.exists({ username: candidate })) {
            attempt++;
            candidate = User.buildUsernameCandidate(base, attempt);
        }
        return candidate;
    }
}
