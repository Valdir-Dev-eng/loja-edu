import path from "node:path";
import express, { Express, NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { ConfigApp } from "../config/ConfigApp";
import { methodHttp, middleWare, ServerPort } from "./ServerPort";

const STOREFRONT_ROOT = path.resolve(process.cwd(), "storefront");

export class ServerExpressAdapter extends ServerPort {
    private app: Express;

    constructor() {
        super();
        this.app = express();
        this.app.disable("x-powered-by");
        this.app.set("trust proxy", true);
        this.app.use(express.json({ limit: "100mb" }));
        this.app.use(cookieParser());
    }

    async addRouter(methodHttp: methodHttp, path: string, ...callback: middleWare[]): Promise<void> {
        console.log(`Rota registrada: ${methodHttp.toUpperCase()}: ${path}`);

        this.app[methodHttp](path, ...callback);
    }

    serveStatic(routePrefix: string, folderPath: string): void {
        this.app.use(routePrefix, express.static(folderPath, { index: "index.html" }));
    }

    useGlobalMiddleware(middleware: middleWare): void {
        this.app.use(middleware as unknown as express.RequestHandler);
    }

    async mountStorefront(): Promise<void> {
        if (ConfigApp.isDevelopment()) {
            const { createServer } = await import("vite");
            const vite = await createServer({
                server: { middlewareMode: true },
                appType: "spa",
                root: STOREFRONT_ROOT,
            });
            this.app.use(vite.middlewares);
            return;
        }

        const distPath = path.join(STOREFRONT_ROOT, "dist");
        this.app.use(express.static(distPath));
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            if (req.method !== "GET") {
                next();
                return;
            }
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    listen(port: number): void {
        this.registerErrorHandler();
        this.app.listen(port);
    }

    private registerErrorHandler(): void {
        this.app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
            if (error instanceof SyntaxError && "body" in error) {
                res.status(400).json({ error: "Corpo da requisição inválido." });
                return;
            }
            console.error("Erro não tratado capturado pelo handler global do servidor:", error);
            res.status(500).json({ error: "Erro interno do servidor." });
        });
    }
}
