import multer from "multer";
import { ProductImageController } from "../controller/ProductImageController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { middleWare, ServerPort } from "../server/ServerPort";
import { UserAuthRouter } from "./UserAuthRouter";

const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 6;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: MAX_FILES_PER_UPLOAD, fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
});

export class ProductImageRouter {
    constructor(
        private server: ServerPort,
        private controller: ProductImageController,
        private authRouter: UserAuthRouter
    ) {
        this.boot();
    }

    private boot() {
        this.server.addRouter(
            "post",
            "/admin/products/:id/images",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.parseUpload,
            this.uploadImages
        );
        this.server.addRouter(
            "delete",
            "/admin/products/:id/images/:imageId",
            this.authRouter.requireSession,
            this.authRouter.requireAdmin,
            this.deleteImage
        );
        this.server.addRouter("get", "/product/:id/images", this.listImages);
    }

    private parseUpload: middleWare = async (req, res, next) => {
        upload.array("images", MAX_FILES_PER_UPLOAD)(req as any, res as any, (error: unknown) => {
            if (error) {
                res.status(400).json({ error: this.describeMulterError(error) });
                return;
            }
            next();
        });
    };

    private describeMulterError(error: unknown): string {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            return "Arquivo excede o tamanho máximo permitido (5MB).";
        }
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_COUNT") {
            return `Envie no máximo ${MAX_FILES_PER_UPLOAD} imagens por vez.`;
        }
        return "Falha ao processar o arquivo enviado.";
    }

    private parseAltTexts(raw: unknown, fileCount: number): (string | null)[] {
        if (typeof raw !== "string" || raw.trim().length === 0) {
            return new Array(fileCount).fill(null);
        }
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return new Array(fileCount).fill(null);
            }
            return new Array(fileCount).fill(null).map((_, index) => {
                const value = parsed[index];
                return typeof value === "string" && value.trim().length > 0 ? value : null;
            });
        } catch {
            return new Array(fileCount).fill(null);
        }
    }

    private uploadImages: middleWare = async (req, res) => {
        try {
            const files = (req as unknown as { files?: Express.Multer.File[] }).files ?? [];
            if (files.length === 0) {
                res.status(400).json({ error: "Nenhum arquivo enviado." });
                return;
            }
            const { id } = req.params;
            const altTexts = this.parseAltTexts(req.body?.altTexts, files.length);
            const result = await this.controller.upload({
                productId: id,
                files: files.map((file, index) => ({
                    bytes: file.buffer,
                    filename: file.originalname,
                    altText: altTexts[index],
                })),
            });
            res.status(201).json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private deleteImage: middleWare = async (req, res) => {
        try {
            const { id, imageId } = req.params;
            await this.controller.delete({ productId: id, imageId });
            res.status(204).send();
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };

    private listImages: middleWare = async (req, res) => {
        try {
            const { id } = req.params;
            const result = await this.controller.list(id);
            res.json(result);
        } catch (error) {
            const { status, body } = HttpErrorMapper.toHttp(error);
            res.status(status).json(body);
        }
    };
}
