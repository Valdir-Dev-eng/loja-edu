import { DataAccessPort } from "../../domain/database/DataAcess";
import { ConfigDb } from "../config/ConfigDb";
import { ConfigEnv } from "../config/ConfigEnv";
import { PostgresDataAccess } from "../database/PostgresDataAccess";
import { DependencyInjection } from "../pattern/DI";
import { ProductInput } from "../schema/ProductSchema";
import { ServerExpressAdapter } from "../server/ServerExpressAdapter";
import { ServerPort } from "../server/ServerPort";
import { Validator } from "../validators/Validator";
import { ProductModule } from "./ProductModule";
import { UserInput } from "../../app/users/dto/UserInput";
import { UserValidator } from "../validators/UserValidator";
import { UserModule } from "./UserModule";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";


export class AppModule {
    private di:DependencyInjection
    private server:ServerPort
    private db: DataAccessPort
    private config:ConfigEnv
    private configDb:ConfigDb
    private validator:DTOBuilderAndValidator
    constructor() {
        this.config = new ConfigEnv()
        this.configDb = new ConfigDb(this.config)
        this.di = new DependencyInjection()
        this.server = new ServerExpressAdapter()
        this.db = new PostgresDataAccess(this.configDb)
        this.validator = new ZodDTOBuilderAndValidator()
        this.di.addDependency(this.server,ServerPort)
        this.di.addDependency(this.db,DataAccessPort)
        this.di.addDependency(this.validator, DTOBuilderAndValidator)        
        this.modules()
    }
    
    private modules(){
        new ProductModule(this.di)
        new UserModule(this.di)
    }

    listen(port:number){
        this.server.listen(port)
    }
}