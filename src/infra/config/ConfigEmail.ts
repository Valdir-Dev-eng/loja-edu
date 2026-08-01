import { ConfigEnv } from "./ConfigEnv";

export type configEmail = {email:string, password:string}

export class ConfigEmail {
    constructor() {}
    static getEmail():configEmail {
        return {
            email: ConfigEnv.getVariable("EMAIL_SMTP"),
            password: ConfigEnv.getVariable("PASS_SMTP")
    }
    }
}