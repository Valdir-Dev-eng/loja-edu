import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookSignatureCheckInput {
    xSignature: string | undefined;
    xRequestId: string | undefined;
    dataId: string | undefined;
    secret: string;
}

interface ParsedXSignature {
    ts: string | null;
    v1: string | null;
}

export class WebhookSignatureValidator {
    static isValid(input: WebhookSignatureCheckInput): boolean {
        const { ts, v1 } = this.parseXSignature(input.xSignature);
        if (!ts || !v1) {
            return false;
        }
        const manifest = this.buildManifest(input.dataId, input.xRequestId, ts);
        const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
        return this.safeCompare(expected, v1);
    }

    private static parseXSignature(header: string | undefined): ParsedXSignature {
        if (!header) {
            return { ts: null, v1: null };
        }
        let ts: string | null = null;
        let v1: string | null = null;
        for (const part of header.split(",")) {
            const separatorIndex = part.indexOf("=");
            if (separatorIndex === -1) continue;
            const key = part.slice(0, separatorIndex).trim();
            const value = part.slice(separatorIndex + 1).trim();
            if (key === "ts") ts = value;
            if (key === "v1") v1 = value;
        }
        return { ts, v1 };
    }

    private static buildManifest(dataId: string | undefined, xRequestId: string | undefined, ts: string): string {
        const parts: string[] = [];
        if (dataId) parts.push(`id:${dataId.toLowerCase()}`);
        if (xRequestId) parts.push(`request-id:${xRequestId}`);
        parts.push(`ts:${ts}`);
        return `${parts.join(";")};`;
    }

    private static safeCompare(expectedHex: string, receivedHex: string): boolean {
        const expectedBuffer = Buffer.from(expectedHex, "hex");
        const receivedBuffer = Buffer.from(receivedHex, "hex");
        if (expectedBuffer.length !== receivedBuffer.length) {
            return false;
        }
        return timingSafeEqual(expectedBuffer, receivedBuffer);
    }
}
