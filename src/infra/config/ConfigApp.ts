import { ConfigEnv } from "./ConfigEnv";

export class ConfigApp {
    static isDevelopment(): boolean {
        try {
            return ConfigEnv.getVariable("NODE_ENV") === "development";
        } catch {
            return false;
        }
    }
}
