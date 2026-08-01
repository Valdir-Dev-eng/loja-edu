const JSON_CONTENT_TYPE_PATTERN = /application\/json/i;

export class MelhorEnvioResponseValidator {
    static hasJsonContentType(contentTypeHeader: string | null): boolean {
        return contentTypeHeader !== null && JSON_CONTENT_TYPE_PATTERN.test(contentTypeHeader);
    }
}
