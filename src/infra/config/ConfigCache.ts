import { ConfigEnv } from "./ConfigEnv";

export interface ICacheSecret {
   key:string
   host:string
   port:number
}

export class ConfigCache {
    constructor(private config:ConfigEnv){
    }
    static getSecrets(): ICacheSecret {
        return {
            key: ConfigEnv.getVariable("API_KEY_REDIS"),
            host: ConfigEnv.getVariable("REDIS_HOST"),
            port: Number.parseInt(ConfigEnv.getVariable("REDIS_PORT")),
        }
    }
}