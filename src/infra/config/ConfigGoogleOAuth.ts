import { ConfigEnv } from "./ConfigEnv";

export interface IGoogleOAuthSecrets {
    clientId: string;
    clientSecret: string;
}

export class ConfigGoogleOAuth {
    static getSecrets(): IGoogleOAuthSecrets {
        return {
            clientId: ConfigEnv.getVariable("GOOGLE_CLIENT_ID"),
            clientSecret: ConfigEnv.getVariable("GOOGLE_CLIENT_SECRET"),
        };
    }
}
