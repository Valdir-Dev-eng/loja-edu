import { ConfigEnv } from "./ConfigEnv";

export interface ITokenSecrets {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtTimeSetSecret: string;
    accessTokenExpiresIn: string | number;
    refreshTokenExpiresIn: string | number;
}

export class ConfigToken {
    constructor(private config:ConfigEnv){
    }
    static getToken(): ITokenSecrets {
        return {
            jwtSecret: ConfigEnv.getVariable("JWT_SECRET"),
            jwtRefreshSecret: ConfigEnv.getVariable("JWT_REFRESH_SECRET"),
            jwtTimeSetSecret: ConfigEnv.getVariable("JWT_TIME_SET_SECRET"),
            accessTokenExpiresIn: "15m",
            refreshTokenExpiresIn: "7d",
        }
    }
}