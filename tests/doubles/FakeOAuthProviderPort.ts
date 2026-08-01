import { OAuthProviderPort } from "../../src/domain/security/OAuthProviderPort";
import { UnauthorizedError } from "../../src/domain/errors/UnauthorizedError";

export class FakeOAuthProviderPort extends OAuthProviderPort {
    private nextVerifiedEmail: string | null = null;
    private shouldFailNextExchange = false;
    public lastExchangedCode: string | null = null;
    public lastRedirectUri: string | null = null;

    authorizeNextExchangeWithEmail(email: string): void {
        this.nextVerifiedEmail = email;
        this.shouldFailNextExchange = false;
    }

    failNextCall(): void {
        this.shouldFailNextExchange = true;
    }

    buildAuthorizationUrl(state: string, redirectUri: string): string {
        return `https://fake-google.test/authorize?state=${state}&redirect_uri=${redirectUri}`;
    }

    async exchangeCodeForVerifiedEmail(code: string, redirectUri: string): Promise<string> {
        this.lastExchangedCode = code;
        this.lastRedirectUri = redirectUri;
        if (this.shouldFailNextExchange || !this.nextVerifiedEmail) {
            throw new UnauthorizedError("Código de autorização inválido.");
        }
        return this.nextVerifiedEmail;
    }
}
