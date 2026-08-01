import { TokenGenerationOptions } from "./IAuthTokenManager";

export abstract class AuthTokenManager {
    abstract generateToken(payload: object, options?: TokenGenerationOptions): string;
    abstract generateRefreshToken(payload: object, options?: TokenGenerationOptions): string;
    abstract generateTimeSetToken(payload: object, expiresIn: string | number): string;
    
    abstract verifyTimeSetToken<T extends object>(token: string): Promise<T>;
    abstract verifyToken<T extends object>(token: string): Promise<T>;
    abstract verifyRefreshToken<T extends object>(token: string): Promise<T>;
    
    abstract decodeToken<T extends object>(token: string): T | null;
}