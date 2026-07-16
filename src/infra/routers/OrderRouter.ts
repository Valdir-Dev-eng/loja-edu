import { OrderController } from "../controller/OrderController";
import { ServiceAuthToken } from "../security/ServiceAuthToken";
import { ServerPort } from "../server/ServerPort";

export class OrderRouter {
    constructor(private server:ServerPort, private serviceToken:ServiceAuthToken, private controller:OrderController) {
        this.setupRouters()
    }
    setupRouters(){
        this.server.addRouter("post", "/createOrder", async (req,res)=>{
        try{
            // const id = await this.verifyToken(req.cookies.tokenUser)
            const id = req.body.idUser
            const order = await this.controller.createOrder({
                userId: id,
                items: req.body.items
            })
            res.json(order)
        }catch(e:any){
            res.status(401).send("acesso não autorizado")
        }
        })
    }
    private async verifyToken(token:string):Promise<string>{
        const tokenUser = await this.serviceToken.verifySessionToken(token) as any
        return tokenUser.id
    }
}