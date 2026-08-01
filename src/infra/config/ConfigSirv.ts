import { ConfigEnv } from "./ConfigEnv";

export interface ISirvSecrets {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
}

const SIRV_API_BASE_URL = "https://api.sirv.com";

export class ConfigSirv {
    static getSecrets(): ISirvSecrets {
        return {
            clientId: ConfigEnv.getVariable("SIRV_CLIENT_ID"),
            clientSecret: ConfigEnv.getVariable("SIRV_CLIENT_SECRET"),
            baseUrl: SIRV_API_BASE_URL,
        };
    }
}
