import { DependencyInjection } from "../pattern/DI";
import { ServerPort } from "../server/ServerPort";
import { ViewController } from "../controller/ViewController";

const HARNESS_ROUTE_PREFIX = "/app";

export class ViewModule {
    private server: ServerPort;
    private controller: ViewController;

    constructor(private di: DependencyInjection) {
        this.server = this.di.getDependency(ServerPort);
        this.controller = new ViewController();
        this.boot();
    }

    private boot() {
        this.server.serveStatic(HARNESS_ROUTE_PREFIX, this.controller.getStaticDirectory());
    }
}
