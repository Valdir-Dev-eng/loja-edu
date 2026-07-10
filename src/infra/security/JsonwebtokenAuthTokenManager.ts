import jwt, { SignOptions } from "jsonwebtoken";
import { AuthTokenManager } from "./AuthTokenManager";
import { IAuthTokenManager, TokenGenerationOptions } from "./IAuthTokenManager";

export class JsonwebtokenAuthTokenManager extends AuthTokenManager implements IAuthTokenManager {
    constructor(
        private readonly jwtSecret: string,
        private readonly jwtRefreshSecret: string,
        private readonly jwtTimeSetSecret: string, 
        private readonly accessTokenExpiresIn: string | number = "15m",
        private readonly refreshTokenExpiresIn: string | number = "7d"
    ) {
        super();
    }

    private buildSignOptions(baseExpiresIn: string | number, options?: TokenGenerationOptions): SignOptions {
        return {
            expiresIn: (options?.expiresIn ?? baseExpiresIn) as SignOptions['expiresIn'],
            issuer: options?.issuer,
            subject: options?.subject,
            jwtid: options?.jwtid,
            notBefore: options?.notBefore as SignOptions['notBefore'],
            audience: options?.audience
        };
    }

    public generateToken(payload: object, options?: TokenGenerationOptions): string {
        return jwt.sign(payload, this.jwtSecret, this.buildSignOptions(this.accessTokenExpiresIn, options));
    }

    public generateRefreshToken(payload: object, options?: TokenGenerationOptions): string {
        return jwt.sign(payload, this.jwtRefreshSecret, this.buildSignOptions(this.refreshTokenExpiresIn, options));
    }

    public generateTokenTimerSet(payload: object, expiresIn: string | number, options?: TokenGenerationOptions): string {
        return jwt.sign(payload, this.jwtTimeSetSecret, this.buildSignOptions(expiresIn, options));
    }

    public verifyToken<T extends object>(token: string): T {
        return jwt.verify(token, this.jwtSecret) as T;
    }

    public verifyRefreshToken<T extends object>(token: string): T {
        return jwt.verify(token, this.jwtRefreshSecret) as T;
    }

    public verifyTokenTimerSet<T extends object>(token: string): T {
        return jwt.verify(token, this.jwtTimeSetSecret) as T;
    }

    public decodeToken<T extends object>(token: string): T | null {
        return jwt.decode(token) as T | null;
    }

    public async revokeToken(token: string): Promise<void> {
        console.warn(`Revogação de token não implementada para: ${token}`);
        return Promise.resolve();
    }
}