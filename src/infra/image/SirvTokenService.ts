import { CachePort } from "../../domain/database/CachePort";

export interface SirvTokenResponse {
    token: string;
    expiresIn: number;
}

export type SirvTokenFetcher = () => Promise<SirvTokenResponse>;

const SIRV_TOKEN_CACHE_KEY = "sirv:token";
const TOKEN_EXPIRY_SAFETY_MARGIN_SECONDS = 60;
const MINIMUM_TTL_SECONDS = 1;

export class SirvTokenService {
    constructor(private cache: CachePort, private fetchToken: SirvTokenFetcher) {}

    async getToken(): Promise<string> {
        const cached = await this.cache.get(SIRV_TOKEN_CACHE_KEY);
        if (cached) {
            return cached;
        }
        return this.renewToken();
    }

    private async renewToken(): Promise<string> {
        const { token, expiresIn } = await this.fetchToken();
        const ttl = Math.max(expiresIn - TOKEN_EXPIRY_SAFETY_MARGIN_SECONDS, MINIMUM_TTL_SECONDS);
        await this.cache.set(SIRV_TOKEN_CACHE_KEY, token, ttl);
        return token;
    }
}
