import { OAuthProviderPort } from "../../domain/security/OAuthProviderPort";
import { UnauthorizedError } from "../../domain/errors/UnauthorizedError";
import { ConfigGoogleOAuth, IGoogleOAuthSecrets } from "../config/ConfigGoogleOAuth";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
}

interface GoogleUserInfoResponse {
    email: string;
    email_verified: boolean;
}

export class GoogleOAuthAdapter extends OAuthProviderPort {
    private readonly secrets: IGoogleOAuthSecrets;

    constructor() {
        super();
        this.secrets = ConfigGoogleOAuth.getSecrets();
    }

    buildAuthorizationUrl(state: string, redirectUri: string): string {
        const params = new URLSearchParams({
            client_id: this.secrets.clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "openid email",
            state,
        });
        return `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`;
    }

    async exchangeCodeForVerifiedEmail(code: string, redirectUri: string): Promise<string> {
        const tokenResponse = await this.requestAccessToken(code, redirectUri);
        const userInfo = await this.requestUserInfo(tokenResponse.access_token);
        if (!userInfo.email_verified) {
            throw new UnauthorizedError("E-mail do Google não verificado.");
        }
        return userInfo.email;
    }

    private async requestAccessToken(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
        const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: this.secrets.clientId,
                client_secret: this.secrets.clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });
        if (!response.ok) {
            throw new UnauthorizedError("Código de autorização do Google inválido.");
        }
        return (await response.json()) as GoogleTokenResponse;
    }

    private async requestUserInfo(accessToken: string): Promise<GoogleUserInfoResponse> {
        const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
            throw new UnauthorizedError("Não foi possível obter a identidade do Google.");
        }
        return (await response.json()) as GoogleUserInfoResponse;
    }
}
