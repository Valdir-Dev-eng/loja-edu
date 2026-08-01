export type DetectedImageType = "image/jpeg" | "image/png" | "image/webp";

const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff];
const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_RIFF_BYTES = [0x52, 0x49, 0x46, 0x46];
const WEBP_MARKER_BYTES = [0x57, 0x45, 0x42, 0x50];
const WEBP_MARKER_OFFSET = 8;

export class ImageFileValidator {
    static detectImageType(bytes: Buffer): DetectedImageType | null {
        if (this.matchesAt(bytes, 0, JPEG_MAGIC_BYTES)) {
            return "image/jpeg";
        }
        if (this.matchesAt(bytes, 0, PNG_MAGIC_BYTES)) {
            return "image/png";
        }
        if (this.matchesAt(bytes, 0, WEBP_RIFF_BYTES) && this.matchesAt(bytes, WEBP_MARKER_OFFSET, WEBP_MARKER_BYTES)) {
            return "image/webp";
        }
        return null;
    }

    private static matchesAt(bytes: Buffer, offset: number, signature: number[]): boolean {
        if (bytes.length < offset + signature.length) {
            return false;
        }
        return signature.every((byte, index) => bytes[offset + index] === byte);
    }
}
