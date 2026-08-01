import multer from "multer";
import { ProductImageController } from "../controller/ProductImageController";
import { HttpErrorMapper } from "../shared/errors/HttpErrorMapper";
import { middleWare, ServerPort } from "../server/ServerPort";
import { UserAuthRouter } from "./UserAuthRouter";

const MAX_UPLOAD_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
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
            this.uploadImage
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
        upload.single("image")(req as any, res as any, (error: unknown) => {
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
            return "Envie apenas um arquivo por vez.";
        }
        return "Falha ao processar o arquivo enviado.";
    }

    private uploadImage: middleWare = async (req, res) => {
        try {
            const file = (req as unknown as { file?: Express.Multer.File }).file;
            if (!file) {
                res.status(400).json({ error: "Nenhum arquivo enviado." });
                return;
            }
            const { id } = req.params;
            const altText = typeof req.body?.altText === "string" ? req.body.altText : null;
            const result = await this.controller.upload({
                productId: id,
                bytes: file.buffer,
                filename: file.originalname,
                altText,
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
