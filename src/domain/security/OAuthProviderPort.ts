export abstract class OAuthProviderPort {
    abstract buildAuthorizationUrl(state: string, redirectUri: string): string;
    abstract exchangeCodeForVerifiedEmail(code: string, redirectUri: string): Promise<string>;
}
