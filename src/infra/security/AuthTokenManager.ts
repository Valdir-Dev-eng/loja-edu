import { TokenGenerationOptions } from "./IAuthTokenManager";

export abstract class AuthTokenManager {
    abstract generateToken(payload: object, options?: TokenGenerationOptions): string;
    abstract generateRefreshToken(payload: object, options?: TokenGenerationOptions): string;
    abstract verifyToken<T extends object>(token: string): T;
    abstract verifyRefreshToken<T extends object>(token: string): T;
    abstract decodeToken<T extends object>(token: string): T | null;
    abstract revokeToken(token: string): Promise<void>;
}