import { AuthTokenManager } from "../../src/infra/security/AuthTokenManager";
import { TokenGenerationOptions } from "../../src/infra/security/IAuthTokenManager";

export class FakeAuthTokenManager extends AuthTokenManager {
    public generatedTokens: { payload: object; options?: TokenGenerationOptions }[] = [];
    public generatedRefreshTokens: { payload: object; options?: TokenGenerationOptions }[] = [];
    public generatedTimeSetTokens: { payload: object; expiresIn: string | number }[] = [];
    private sequence = 0;
    private nextVerifiedPayload: object = {};
    private nextDecodedPayload: object | null = null;
    private nextVerifyError: Error | null = null;

    setNextVerifiedPayload(payload: object): void {
        this.nextVerifiedPayload = payload;
    }

    setNextDecodedPayload(payload: object | null): void {
        this.nextDecodedPayload = payload;
    }

    failNextVerifyWith(error: Error): void {
        this.nextVerifyError = error;
    }

    private consumeVerifyError(): void {
        if (this.nextVerifyError) {
            const error = this.nextVerifyError;
            this.nextVerifyError = null;
            throw error;
        }
    }

    generateToken(payload: object, options?: TokenGenerationOptions): string {
        this.generatedTokens.push({ payload, options });
        this.sequence++;
        return `fake-token-${this.sequence}`;
    }

    generateRefreshToken(payload: object, options?: TokenGenerationOptions): string {
        this.generatedRefreshTokens.push({ payload, options });
        this.sequence++;
        return `fake-refresh-token-${this.sequence}`;
    }

    generateTimeSetToken(payload: object, expiresIn: string | number): string {
        this.generatedTimeSetTokens.push({ payload, expiresIn });
        this.sequence++;
        return `fake-time-set-token-${this.sequence}`;
    }

    async verifyTimeSetToken<T extends object>(token: string): Promise<T> {
        this.consumeVerifyError();
        return this.nextVerifiedPayload as T;
    }

    async verifyToken<T extends object>(token: string): Promise<T> {
        this.consumeVerifyError();
        return this.nextVerifiedPayload as T;
    }

    async verifyRefreshToken<T extends object>(token: string): Promise<T> {
        this.consumeVerifyError();
        return this.nextVerifiedPayload as T;
    }

    decodeToken<T extends object>(token: string): T | null {
        return this.nextDecodedPayload as T | null;
    }
}
