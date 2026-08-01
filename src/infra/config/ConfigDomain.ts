import { ConfigEnv } from "./ConfigEnv";

export class ConfigDomain {
    constructor() {
    }
    static getDomain():string{
        return ConfigEnv.getVariable("NODE_ENV") === "development" ?
        ConfigEnv.getVariable("DOMAIN_LOCAL")
        :
        ConfigEnv.getVariable("DOMAIN_PROD")
    }
    static get secure(){
        return ConfigEnv.getVariable("NODE_ENV") === "development"
    }
}