import { ConfigApp } from "./ConfigApp";
import { ConfigEnv } from "./ConfigEnv";

export interface IMercadoPagoSecrets {
    accessToken: string;
    webhookSecret: string;
    baseUrl: string;
}

const MERCADO_PAGO_API_BASE_URL = "https://api.mercadopago.com";

export class ConfigMercadoPago {
    static getSecrets(): IMercadoPagoSecrets {
        return {
            accessToken: ConfigApp.isDevelopment()
                ? ConfigEnv.getVariable("MP_ACCESS_TOKEN_TEST")
                : ConfigEnv.getVariable("MP_ACCESS_TOKEN"),
            webhookSecret: ConfigEnv.getVariable("MP_WEBHOOK_SECRET"),
            baseUrl: MERCADO_PAGO_API_BASE_URL,
        };
    }
}
