import { CachePort } from "../../domain/database/CachePort";
import { ImageStorageGatewayPort, UploadImageInput, UploadImageOutput } from "../../domain/image/ImageStorageGatewayPort";
import { ConfigSirv, ISirvSecrets } from "../config/ConfigSirv";
import { SirvTokenResponse, SirvTokenService } from "./SirvTokenService";

interface SirvAccountResponse {
    cdnURL: string;
}

export class SirvAdapter extends ImageStorageGatewayPort {
    private readonly secrets: ISirvSecrets;
    private readonly tokenService: SirvTokenService;

    constructor(cache: CachePort) {
        super();
        this.secrets = ConfigSirv.getSecrets();
        this.tokenService = new SirvTokenService(cache, () => this.requestToken());
    }

    async upload(input: UploadImageInput): Promise<UploadImageOutput> {
        const token = await this.tokenService.getToken();
        const response = await fetch(`${this.secrets.baseUrl}/v2/files/upload?filename=${encodeURIComponent(input.filename)}`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": input.contentType,
            },
            body: input.bytes as unknown as BodyInit,
        });
        if (!response.ok) {
            const responseBody = await response.text().catch(() => "");
            throw new Error(`Falha ao enviar imagem para o Sirv (status ${response.status}): ${responseBody}`);
        }
        const account = await this.requestAccount(token);
        return { url: `https://${account.cdnURL}${input.filename}` };
    }

    async remove(url: string): Promise<void> {
        const token = await this.tokenService.getToken();
        const filename = new URL(url).pathname;
        const response = await fetch(`${this.secrets.baseUrl}/v2/files/batch/delete`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ filenames: [filename] }),
        });
        if (!response.ok) {
            const responseBody = await response.text().catch(() => "");
            throw new Error(`Falha ao remover imagem no Sirv (status ${response.status}): ${responseBody}`);
        }
    }

    private async requestAccount(token: string): Promise<SirvAccountResponse> {
        const response = await fetch(`${this.secrets.baseUrl}/v2/account`, {
            headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            throw new Error(`Falha ao consultar conta Sirv (status ${response.status}).`);
        }
        return (await response.json()) as SirvAccountResponse;
    }

    private async requestToken(): Promise<SirvTokenResponse> {
        const response = await fetch(`${this.secrets.baseUrl}/v2/token`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ clientId: this.secrets.clientId, clientSecret: this.secrets.clientSecret }),
        });
        if (!response.ok) {
            throw new Error(`Falha ao autenticar no Sirv (status ${response.status}).`);
        }
        return (await response.json()) as SirvTokenResponse;
    }
}
