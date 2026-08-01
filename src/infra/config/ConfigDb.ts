import { ConfigEnv } from "./ConfigEnv";

export class ConfigDb {


    static getDb():string{
        return ConfigEnv.getVariable("DIRECT_URL")
    }

}