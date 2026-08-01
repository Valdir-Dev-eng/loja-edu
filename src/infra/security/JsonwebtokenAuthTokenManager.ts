import jwt, { SignOptions } from "jsonwebtoken";
import { AuthTokenManager } from "./AuthTokenManager";
import { TokenGenerationOptions } from "./IAuthTokenManager";
import { ConfigToken, ITokenSecrets } from "../config/ConfigToken";

export class JsonwebtokenAuthTokenManager extends AuthTokenManager {
    private readonly secrets: ITokenSecrets;
    constructor() {
        super();
        this.secrets = ConfigToken.getToken();
    }
    generateTimeSetToken(payload: object, expiresIn: string | number): string {
        const options: jwt.SignOptions = { 
            expiresIn: expiresIn as jwt.SignOptions['expiresIn'] 
        };
        return jwt.sign(payload, this.secrets.jwtTimeSetSecret, options);
    }
    async verifyTimeSetToken<T extends object>(token: string): Promise<T> {
        return jwt.verify(token, this.secrets.jwtTimeSetSecret) as T;
    }
private buildSignOptions(baseExpiresIn: string | number, options?: TokenGenerationOptions): SignOptions {
    const rawOptions = {
        expiresIn: (options?.expiresIn ?? baseExpiresIn) as SignOptions['expiresIn'],
        issuer: options?.issuer,
        subject: options?.subject,
        jwtid: options?.jwtid,
        notBefore: options?.notBefore as SignOptions['notBefore'],
        audience: options?.audience
    };

    return Object.fromEntries(
        Object.entries(rawOptions).filter(([_, value]) => value !== undefined)
    ) as SignOptions;
}
    public generateToken(payload: object, options?: TokenGenerationOptions): string {
        console.log(payload, this.secrets.jwtSecret, this.buildSignOptions(this.secrets.accessTokenExpiresIn, options));
        
        return jwt.sign(payload, this.secrets.jwtSecret, this.buildSignOptions(this.secrets.accessTokenExpiresIn, options));
    }
    public generateRefreshToken(payload: object, options?: TokenGenerationOptions): string {
        return jwt.sign(payload, this.secrets.jwtRefreshSecret, this.buildSignOptions(this.secrets.refreshTokenExpiresIn, options));
    }
    public generateTokenTimerSet(payload: object, expiresIn: string | number, options?: TokenGenerationOptions): string {
        return jwt.sign(payload, this.secrets.jwtTimeSetSecret, this.buildSignOptions(expiresIn, options));
    }
    public async verifyToken<T extends object>(token: string): Promise<T> {
        return jwt.verify(token, this.secrets.jwtSecret) as T;
    }
    public async verifyRefreshToken<T extends object>(token: string): Promise<T> {
        return jwt.verify(token, this.secrets.jwtRefreshSecret) as T;
    }
    public decodeToken<T extends object>(token: string): T | null {
        return jwt.decode(token) as T | null;
    }
}