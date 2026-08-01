import {config} from "dotenv"
import {expand} from "dotenv-expand"

expand(config())

export class ConfigEnv {
    static getVariable(variable:string){
        const variableEnv = process.env[variable]
        if(!variableEnv)
            throw new Error("Variable: "+variable + " not found")
        return variableEnv
    }

    static getOptionalVariable(variable:string): string | null {
        return process.env[variable] || null
    }
}