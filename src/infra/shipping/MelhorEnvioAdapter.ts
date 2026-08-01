import { DataAccessPort } from "../../domain/database/DataAcess";
import { BusinessRuleError } from "../../domain/errors/BusinessRuleError";
import { ConflictError } from "../../domain/errors/ConflictError";
import {
    InsertShippingInCartInput,
    InsertShippingInCartOutput,
    ShippingDestination,
    ShippingGatewayPort,
    ShippingQuoteInput,
    ShippingQuoteOption,
} from "../../domain/shipping/ShippingGatewayPort";
import { ConfigMelhorEnvio, IMelhorEnvioSecrets, IStoreOrigin } from "../config/ConfigMelhorEnvio";
import { MelhorEnvioConnectionRepository } from "../repository/MelhorEnvioConnectionRepository";
import { MelhorEnvioCarrierRules } from "./MelhorEnvioCarrierRules";
import { MelhorEnvioPriceParser } from "./MelhorEnvioPriceParser";
import { MelhorEnvioResponseValidator } from "./MelhorEnvioResponseValidator";
import { MelhorEnvioTokenService } from "./MelhorEnvioTokenService";

const MELHOR_ENVIO_SCOPES = "shipping-calculate cart-read cart-write purchases-read shipping-print";
const ALREADY_PAID_MESSAGE_FRAGMENT = "já foram pagas";

interface MelhorEnvioTokenResponse {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token: string;
}

interface MelhorEnvioCalculateResponseItem {
    id: number;
    name: string;
    price: string | number;
    custom_price?: string | number;
    delivery_time: number;
    error?: string;
}

interface MelhorEnvioCartResponse {
    id: string;
    price: string | number;
}

export class MelhorEnvioAdapter extends ShippingGatewayPort {
    private readonly tokenService: MelhorEnvioTokenService;

    constructor(dataAccess: DataAccessPort) {
        super();
        const connectionRepo = new MelhorEnvioConnectionRepository(dataAccess);
        this.tokenService = new MelhorEnvioTokenService(connectionRepo, (refreshToken) =>
            this.requestTokenRefresh(refreshToken)
        );
    }

    buildAuthorizationUrl(state: string, redirectUri: string): string {
        const secrets = this.getSecrets();
        const params = new URLSearchParams({
            client_id: secrets.clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            state,
            scope: MELHOR_ENVIO_SCOPES,
        });
        return `${secrets.baseUrl}/oauth/authorize?${params.toString()}`;
    }

    async completeConnection(code: string, redirectUri: string): Promise<void> {
        const secrets = this.getSecrets();
        const response = await this.requestJson<MelhorEnvioTokenResponse>(`${secrets.baseUrl}/oauth/token`, {
            method: "POST",
            headers: this.jsonHeaders(secrets),
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: secrets.clientId,
                client_secret: secrets.clientSecret,
                redirect_uri: redirectUri,
                code,
            }),
        });
        await this.tokenService.saveConnection(response.access_token, response.refresh_token, response.expires_in);
    }

    async isConnected(): Promise<boolean> {
        return this.tokenService.isConnected();
    }

    async quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]> {
        const secrets = this.getSecrets();
        const storeOrigin = this.getStoreOrigin();
        const token = await this.tokenService.getValidAccessToken();
        const response = await this.requestJson<MelhorEnvioCalculateResponseItem[]>(
            `${secrets.baseUrl}/api/v2/me/shipment/calculate`,
            {
                method: "POST",
                headers: this.authHeaders(secrets, token),
                body: JSON.stringify({
                    from: { postal_code: storeOrigin.postalCode },
                    to: { postal_code: input.destinationPostalCode },
                    products: input.items.map((item, index) => ({
                        id: `item-${index}`,
                        width: item.widthCm,
                        height: item.heightCm,
                        length: item.lengthCm,
                        weight: item.weightKg,
                        insurance_value: item.insuranceValueCents / 100,
                        quantity: item.quantity,
                    })),
                }),
            },
            2
        );

        return response
            .filter((option) => !option.error)
            .map((option) => ({
                serviceId: option.id,
                carrierName: option.name,
                priceCents: MelhorEnvioPriceParser.toCents(option.custom_price ?? option.price),
                deliveryTimeDays: option.delivery_time,
            }))
            .filter((option) => MelhorEnvioCarrierRules.isPurchasableViaApi(option.carrierName, secrets.isSandbox));
    }

    async insertInCart(input: InsertShippingInCartInput): Promise<InsertShippingInCartOutput> {
        const secrets = this.getSecrets();
        const storeOrigin = this.getStoreOrigin();
        const token = await this.tokenService.getValidAccessToken();
        const response = await this.requestJson<MelhorEnvioCartResponse>(`${secrets.baseUrl}/api/v2/me/cart`, {
            method: "POST",
            headers: this.authHeaders(secrets, token),
            body: JSON.stringify({
                service: input.serviceId,
                from: this.buildOriginParty(storeOrigin),
                to: this.buildDestinationParty(input.destination),
                products: input.products.map((product) => ({
                    name: product.name,
                    quantity: String(product.quantity),
                    unitary_value: (product.unitaryValueCents / 100).toFixed(2),
                })),
                volumes: input.volumes.map((volume) => ({
                    height: volume.heightCm,
                    width: volume.widthCm,
                    length: volume.lengthCm,
                    weight: volume.weightKg,
                })),
            }),
        });

        return {
            cartItemId: response.id,
            priceCents: MelhorEnvioPriceParser.toCents(response.price),
        };
    }

    async purchase(cartItemId: string): Promise<void> {
        const secrets = this.getSecrets();
        const token = await this.tokenService.getValidAccessToken();
        const response = await fetch(`${secrets.baseUrl}/api/v2/me/shipment/checkout`, {
            method: "POST",
            headers: this.authHeaders(secrets, token),
            body: JSON.stringify({ orders: [cartItemId] }),
        });
        if (response.ok) {
            return;
        }
        const responseBody = await response.text().catch(() => "");
        if (responseBody.includes(ALREADY_PAID_MESSAGE_FRAGMENT)) {
            throw new ConflictError("Frete já foi comprado para este pedido.");
        }
        throw new Error(`Falha ao comprar frete no Melhor Envio (status ${response.status}): ${responseBody}`);
    }

    async getPrintLink(cartItemId: string): Promise<string> {
        const secrets = this.getSecrets();
        const token = await this.tokenService.getValidAccessToken();
        const response = await this.requestJson<{ url: string }>(
            `${secrets.baseUrl}/api/v2/me/shipment/print`,
            {
                method: "POST",
                headers: this.authHeaders(secrets, token),
                body: JSON.stringify({ mode: "private", orders: [cartItemId] }),
            },
            2
        );
        return response.url;
    }

    private getSecrets(): IMelhorEnvioSecrets {
        try {
            return ConfigMelhorEnvio.getSecrets();
        } catch {
            throw new BusinessRuleError("Configuração do Melhor Envio está incompleta. Contate o suporte.");
        }
    }

    private getStoreOrigin(): IStoreOrigin {
        try {
            return ConfigMelhorEnvio.getStoreOrigin();
        } catch {
            throw new BusinessRuleError("Configuração do endereço de origem da loja está incompleta. Contate o suporte.");
        }
    }

    private buildOriginParty(storeOrigin: IStoreOrigin): Record<string, unknown> {
        return {
            name: storeOrigin.name,
            document: storeOrigin.document,
            address: storeOrigin.address,
            number: storeOrigin.number,
            complement: storeOrigin.complement ?? "",
            district: storeOrigin.district,
            city: storeOrigin.city,
            state_abbr: storeOrigin.stateAbbr,
            postal_code: storeOrigin.postalCode,
            country_id: "BR",
            phone: storeOrigin.phone ?? "",
            email: storeOrigin.email ?? "",
        };
    }

    private buildDestinationParty(destination: ShippingDestination): Record<string, unknown> {
        return {
            name: destination.recipientName,
            document: destination.document,
            address: destination.street,
            number: destination.number,
            complement: destination.complement ?? "",
            district: destination.neighborhood,
            city: destination.city,
            state_abbr: destination.state,
            postal_code: destination.zipCode,
            country_id: "BR",
        };
    }

    private async requestTokenRefresh(
        refreshToken: string
    ): Promise<{ accessToken: string; refreshToken: string; expiresInSeconds: number }> {
        const secrets = this.getSecrets();
        const response = await this.requestJson<MelhorEnvioTokenResponse>(`${secrets.baseUrl}/oauth/token`, {
            method: "POST",
            headers: this.jsonHeaders(secrets),
            body: JSON.stringify({
                grant_type: "refresh_token",
                client_id: secrets.clientId,
                client_secret: secrets.clientSecret,
                refresh_token: refreshToken,
            }),
        });
        return {
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiresInSeconds: response.expires_in,
        };
    }

    private async requestJson<T>(url: string, options: RequestInit, maxAttempts = 1, attempt = 1): Promise<T> {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        if (!MelhorEnvioResponseValidator.hasJsonContentType(contentType)) {
            if (attempt < maxAttempts) {
                return this.requestJson<T>(url, options, maxAttempts, attempt + 1);
            }
            throw new Error(`Melhor Envio devolveu conteúdo inesperado (não-JSON) após ${attempt} tentativa(s).`);
        }
        const body = await response.json();
        if (!response.ok) {
            throw new Error(`Falha na chamada ao Melhor Envio (status ${response.status}): ${JSON.stringify(body)}`);
        }
        return body as T;
    }

    private jsonHeaders(secrets: IMelhorEnvioSecrets): Record<string, string> {
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": secrets.userAgent,
        };
    }

    private authHeaders(secrets: IMelhorEnvioSecrets, token: string): Record<string, string> {
        return { ...this.jsonHeaders(secrets), Authorization: `Bearer ${token}` };
    }
}
