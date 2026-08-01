import path from "node:path";

export class ViewController {
    getStaticDirectory(): string {
        return path.resolve(process.cwd(), "public");
    }
}
