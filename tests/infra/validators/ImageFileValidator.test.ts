import { describe, expect, it } from "vitest";
import { ImageFileValidator } from "../../../src/infra/validators/ImageFileValidator";

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP_BYTES = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);
const PDF_DISGUISED_AS_JPEG = Buffer.from("%PDF-1.4\n%âãÏÓ\n", "latin1");

describe("ImageFileValidator", () => {
    describe("detectImageType", () => {
        it("reconhece um JPEG válido pelos magic bytes", () => {
            expect(ImageFileValidator.detectImageType(JPEG_BYTES)).toBe("image/jpeg");
        });

        it("reconhece um PNG válido pelos magic bytes", () => {
            expect(ImageFileValidator.detectImageType(PNG_BYTES)).toBe("image/png");
        });

        it("reconhece um WebP válido pelos magic bytes (RIFF + WEBP)", () => {
            expect(ImageFileValidator.detectImageType(WEBP_BYTES)).toBe("image/webp");
        });

        it("recusa um PDF disfarçado de imagem (Content-Type mentiroso não importa aqui)", () => {
            expect(ImageFileValidator.detectImageType(PDF_DISGUISED_AS_JPEG)).toBeNull();
        });

        it("recusa um arquivo RIFF que não é WebP (assinatura RIFF sem marcador WEBP)", () => {
            const riffButNotWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]);

            expect(ImageFileValidator.detectImageType(riffButNotWebp)).toBeNull();
        });

        it("recusa buffer vazio", () => {
            expect(ImageFileValidator.detectImageType(Buffer.from([]))).toBeNull();
        });

        it("recusa buffer menor que a assinatura esperada", () => {
            expect(ImageFileValidator.detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
        });
    });
});
