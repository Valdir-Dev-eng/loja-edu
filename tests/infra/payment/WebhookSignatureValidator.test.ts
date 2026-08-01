import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WebhookSignatureValidator } from "../../../src/infra/payment/WebhookSignatureValidator";

const SECRET = "mp-webhook-secret";

const buildSignatureHeader = (manifest: string, secret: string = SECRET): string => {
    const hash = createHmac("sha256", secret).update(manifest).digest("hex");
    return hash;
};

const buildXSignature = (ts: string, hash: string): string => `ts=${ts},v1=${hash}`;

describe("WebhookSignatureValidator", () => {
    it("aceita assinatura válida com dataId e requestId presentes", () => {
        const ts = "1700000000000";
        const dataId = "123456789";
        const requestId = "request-id-1";
        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const hash = buildSignatureHeader(manifest);

        const isValid = WebhookSignatureValidator.isValid({
            xSignature: buildXSignature(ts, hash),
            xRequestId: requestId,
            dataId,
            secret: SECRET,
        });

        expect(isValid).toBe(true);
    });

    it("normaliza o dataId para minúsculas antes de montar o manifesto", () => {
        const ts = "1700000000000";
        const requestId = "request-id-1";
        const manifest = `id:abc123;request-id:${requestId};ts:${ts};`;
        const hash = buildSignatureHeader(manifest);

        const isValid = WebhookSignatureValidator.isValid({
            xSignature: buildXSignature(ts, hash),
            xRequestId: requestId,
            dataId: "ABC123",
            secret: SECRET,
        });

        expect(isValid).toBe(true);
    });

    it("omite o dataId do manifesto quando ele não está presente", () => {
        const ts = "1700000000000";
        const requestId = "request-id-1";
        const manifest = `request-id:${requestId};ts:${ts};`;
        const hash = buildSignatureHeader(manifest);

        const isValid = WebhookSignatureValidator.isValid({
            xSignature: buildXSignature(ts, hash),
            xRequestId: requestId,
            dataId: undefined,
            secret: SECRET,
        });

        expect(isValid).toBe(true);
    });

    it("recusa quando o hash foi adulterado", () => {
        const ts = "1700000000000";
        const dataId = "123456789";
        const requestId = "request-id-1";
        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const hash = buildSignatureHeader(manifest);
        const tamperedHash = hash.slice(0, -2) + (hash.slice(-2) === "00" ? "11" : "00");

        const isValid = WebhookSignatureValidator.isValid({
            xSignature: buildXSignature(ts, tamperedHash),
            xRequestId: requestId,
            dataId,
            secret: SECRET,
        });

        expect(isValid).toBe(false);
    });

    it("recusa quando o segredo usado não confere", () => {
        const ts = "1700000000000";
        const dataId = "123456789";
        const requestId = "request-id-1";
        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const hash = buildSignatureHeader(manifest, "outro-segredo");

        const isValid = WebhookSignatureValidator.isValid({
            xSignature: buildXSignature(ts, hash),
            xRequestId: requestId,
            dataId,
            secret: SECRET,
        });

        expect(isValid).toBe(false);
    });

    it("recusa quando o header x-signature está ausente", () => {
        const isValid = WebhookSignatureValidator.isValid({
            xSignature: undefined,
            xRequestId: "request-id-1",
            dataId: "123456789",
            secret: SECRET,
        });

        expect(isValid).toBe(false);
    });

    it("recusa quando o header x-signature está malformado sem v1", () => {
        const isValid = WebhookSignatureValidator.isValid({
            xSignature: "ts=1700000000000",
            xRequestId: "request-id-1",
            dataId: "123456789",
            secret: SECRET,
        });

        expect(isValid).toBe(false);
    });

    it("recusa quando o v1 recebido não é hexadecimal válido", () => {
        const ts = "1700000000000";
        const isValid = WebhookSignatureValidator.isValid({
            xSignature: buildXSignature(ts, "não-é-hexadecimal"),
            xRequestId: "request-id-1",
            dataId: "123456789",
            secret: SECRET,
        });

        expect(isValid).toBe(false);
    });
});
