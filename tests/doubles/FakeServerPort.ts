import { methodHttp, middleWare, ServerPort } from "../../src/infra/server/ServerPort";

export class FakeServerPort extends ServerPort {
    public registeredRoutes: { method: methodHttp; path: string; handlers: middleWare[] }[] = [];

    async addRouter(methodHttp: methodHttp, path: string, ...callback: middleWare[]): Promise<void> {
        this.registeredRoutes.push({ method: methodHttp, path, handlers: callback });
    }

    serveStatic(): void {}

    useGlobalMiddleware(): void {}

    async mountStorefront(): Promise<void> {}

    listen(): void {}
}
