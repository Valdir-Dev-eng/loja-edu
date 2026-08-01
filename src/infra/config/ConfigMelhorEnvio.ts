import { ConfigEnv } from "./ConfigEnv";

export interface IMelhorEnvioSecrets {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    userAgent: string;
    baseUrl: string;
    isSandbox: boolean;
}

export interface IStoreOrigin {
    name: string;
    document: string;
    postalCode: string;
    address: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    stateAbbr: string;
    phone: string | null;
    email: string | null;
}

const PRODUCTION_BASE_URL = "https://melhorenvio.com.br";
const SANDBOX_BASE_URL = "https://sandbox.melhorenvio.com.br";

export class ConfigMelhorEnvio {
    static isSandbox(): boolean {
        return ConfigEnv.getVariable("MELHOR_ENVIO_SANDBOX") === "true";
    }

    static getSecrets(): IMelhorEnvioSecrets {
        const isSandbox = this.isSandbox();
        return {
            clientId: ConfigEnv.getVariable("MELHOR_ENVIO_CLIENT_ID"),
            clientSecret: ConfigEnv.getVariable("MELHOR_ENVIO_CLIENT_SECRET"),
            redirectUri: ConfigEnv.getVariable("MELHOR_ENVIO_REDIRECT_URI"),
            userAgent: ConfigEnv.getVariable("MELHOR_ENVIO_USER_AGENT"),
            baseUrl: isSandbox ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL,
            isSandbox,
        };
    }

    static getStoreOrigin(): IStoreOrigin {
        return {
            name: ConfigEnv.getVariable("STORE_ORIGIN_NAME"),
            document: ConfigEnv.getVariable("STORE_ORIGIN_DOCUMENT"),
            postalCode: ConfigEnv.getVariable("STORE_ORIGIN_POSTAL_CODE"),
            address: ConfigEnv.getVariable("STORE_ORIGIN_ADDRESS"),
            number: ConfigEnv.getVariable("STORE_ORIGIN_NUMBER"),
            complement: ConfigEnv.getOptionalVariable("STORE_ORIGIN_COMPLEMENT"),
            district: ConfigEnv.getVariable("STORE_ORIGIN_DISTRICT"),
            city: ConfigEnv.getVariable("STORE_ORIGIN_CITY"),
            stateAbbr: ConfigEnv.getVariable("STORE_ORIGIN_STATE"),
            phone: ConfigEnv.getOptionalVariable("STORE_ORIGIN_PHONE"),
            email: ConfigEnv.getOptionalVariable("STORE_ORIGIN_EMAIL"),
        };
    }
}
