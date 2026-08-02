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
    static getLojaOrigin():string{
        // Em dev o Next roda num processo/porta separado do Express.
        // Em producao os dois ficam atras do mesmo dominio/proxy, entao
        // reaproveita getDomain() em vez de precisar de outra variavel.
        return ConfigEnv.getVariable("NODE_ENV") === "development" ?
        ConfigEnv.getVariable("LOJA_ORIGIN_LOCAL")
        :
        ConfigDomain.getDomain()
    }
}