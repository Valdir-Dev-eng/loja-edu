import { DataAccessPort } from "../../domain/database/DataAcess";
import { PostgresDataAccess } from "../database/PostgresDataAccess";
import { DependencyInjection } from "../pattern/DI";
import { ServerExpressAdapter } from "../server/ServerExpressAdapter";
import { ServerPort } from "../server/ServerPort";
import { ProductModule } from "./ProductModule";
import { UserModule } from "./UserModule";
import { ViewModule } from "./ViewModule";
import { ZodDTOBuilderAndValidator } from "../shared/validators/ZodDTOBuilderAndValidator";
import { DTOBuilderAndValidator } from "../shared/validators/DTOBuilderAndValidator";
import { AuthTokenManager } from "../security/AuthTokenManager";
import { JsonwebtokenAuthTokenManager } from "../security/JsonwebtokenAuthTokenManager";
import { OAuthProviderPort } from "../../domain/security/OAuthProviderPort";
import { GoogleOAuthAdapter } from "../security/GoogleOAuthAdapter";
import { SmtpEmailServiceAdapter } from "../email/SmptEmailServiceAdapter";
import { EmailPort } from "../email/EmailPort";
import { RedisCacheAdapter } from "../database/RedisCacheAdapter";
import { CachePort } from "../../domain/database/CachePort";
import { ServiceAuthToken } from "../security/ServiceAuthToken";
import { OrderModule } from "./OrderModule";
import { ConfigApp } from "../config/ConfigApp";
import { DevModule } from "./DevModule";
import { AdminModule } from "./AdminModule";
import { PaymentGatewayPort } from "../../domain/payment/PaymentGatewayPort";
import { MercadoPagoAdapter } from "../payment/MercadoPagoAdapter";
import { ImageStorageGatewayPort } from "../../domain/image/ImageStorageGatewayPort";
import { SirvAdapter } from "../image/SirvAdapter";
import { CategoryModule } from "./CategoryModule";
import { ProductImageModule } from "./ProductImageModule";
import { RateLimiterPort } from "../../domain/rateLimit/RateLimiterPort";
import { RedisRateLimiterAdapter } from "../rateLimit/RedisRateLimiterAdapter";
import { RateLimitMiddleware } from "../rateLimit/RateLimitMiddleware";
import { RateLimitRouteRules } from "../rateLimit/RateLimitRouteRules";
import { InMemoryRateLimiter } from "../rateLimit/InMemoryRateLimiter";
import { RedisCircuitBreaker } from "../shared/RedisCircuitBreaker";
import { ShippingGatewayPort } from "../../domain/shipping/ShippingGatewayPort";
import { MelhorEnvioAdapter } from "../shipping/MelhorEnvioAdapter";
import { ShippingModule } from "./ShippingModule";
import { CartModule } from "./CartModule";
import { WebSocketNotifierPort } from "../../domain/realtime/WebSocketNotifierPort";
import { WsOrderNotifierAdapter } from "../realtime/WsOrderNotifierAdapter";

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_HALF_OPEN_INTERVAL_MS = 15_000;


export class AppModule {
    private di:DependencyInjection
    private server:ServerPort
    private cache:CachePort
    private serviceAuthToken:ServiceAuthToken
    private redisRateLimiter:RedisRateLimiterAdapter
    private redisCache:RedisCacheAdapter
    private inMemoryRateLimiter:InMemoryRateLimiter
    constructor() {
        this.di = new DependencyInjection()
        // Uma unica instancia de breaker, compartilhada entre cache e rate
        // limiter — de proposito, ver comentario em RedisCircuitBreaker.ts.
        const redisBreaker = new RedisCircuitBreaker({
            failureThreshold: CIRCUIT_BREAKER_FAILURE_THRESHOLD,
            halfOpenIntervalMs: CIRCUIT_BREAKER_HALF_OPEN_INTERVAL_MS,
        })
        this.inMemoryRateLimiter = new InMemoryRateLimiter()
        this.redisCache = new RedisCacheAdapter(redisBreaker)
        this.redisRateLimiter = new RedisRateLimiterAdapter(redisBreaker, this.inMemoryRateLimiter)
        this.di.addDependency(this.redisCache, CachePort)
        this.di.addDependency(new ServerExpressAdapter(), ServerPort)
        this.di.addDependency(new PostgresDataAccess(), DataAccessPort)
        this.di.addDependency(new ZodDTOBuilderAndValidator(), DTOBuilderAndValidator)
        this.di.addDependency(new JsonwebtokenAuthTokenManager(), AuthTokenManager)
        this.di.addDependency(new GoogleOAuthAdapter(), OAuthProviderPort)
        this.di.addDependency(new SmtpEmailServiceAdapter(), EmailPort)
        this.di.addDependency(new MercadoPagoAdapter(), PaymentGatewayPort)
        this.di.addDependency(new SirvAdapter(this.di.getDependency(CachePort)), ImageStorageGatewayPort)
        this.di.addDependency(new MelhorEnvioAdapter(this.di.getDependency(DataAccessPort)), ShippingGatewayPort)
        this.di.addDependency(this.redisRateLimiter, RateLimiterPort)
        this.serviceAuthToken = new ServiceAuthToken(this.di)
        this.server = this.di.getDependency(ServerPort)
        this.cache = this.di.getDependency(CachePort)
        this.di.addDependency(new WsOrderNotifierAdapter(this.server.getHttpServer(), this.cache), WebSocketNotifierPort)
        const rateLimiter = this.di.getDependency<RateLimiterPort>(RateLimiterPort)
        const rateLimitMiddleware = new RateLimitMiddleware(rateLimiter, RateLimitRouteRules)
        this.server.useGlobalMiddleware(rateLimitMiddleware.handle)
        this.modules()
    }
    
    private modules(){
        const userModule = new UserModule(this.di,this.serviceAuthToken)
        new ProductModule(this.di, userModule.authRouter)
        new CategoryModule(this.di, userModule.authRouter)
        new ProductImageModule(this.di, userModule.authRouter)
        const cartModule = new CartModule(this.di, userModule.authRouter)
        userModule.authRouter.setCartAttachHandler((cartIdFromCookie, userId) =>
            cartModule.controller.attachToUser(cartIdFromCookie, userId)
        )
        const orderModule = new OrderModule(this.di, userModule.authRouter)
        new ShippingModule(this.di, userModule.authRouter)
        new AdminModule(this.di, userModule.authRouter, orderModule.controller)
        if(ConfigApp.isDevelopment()){
            new DevModule(this.di, userModule.authRouter)
        }
        new ViewModule(this.di)
    }

    async listen(port:number): Promise<void> {
        await this.server.mountStorefront()
        this.server.listen(port)
    }

    async shutdown(): Promise<void> {
        this.inMemoryRateLimiter.stop()
        await Promise.all([
            this.redisRateLimiter.disconnect().catch(() => {}),
            this.redisCache.disconnect().catch(() => {}),
        ])
    }
}