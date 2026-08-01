export type methodHttp = "get" | "post" | "put" | "delete";

export type IRequest<TBody = any, TParams = any, TQuery = any, TInjected = {}> = {
    body: TBody;
    params: TParams;
    query: TQuery;
    cookies: any;
    headers: any;
    protocol: string;
    path: string;
    method: string;
    ip: string | undefined;
} & TInjected;

export type IResponse = {
    send(message?: string): any;
    json(body: any): any;
    status(status: number): IResponse;
    cookie(name: string, val: string, options?: ICookieOptions): IResponse;
    clearCookie(name: string): IResponse;
    redirect(url: string): any;
}

export interface ICookieOptions {
  domain?: string;
  encode?: (val: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  priority?: "low" | "medium" | "high";
  secure?: boolean;
  signed?: boolean;
  sameSite?: "strict" | "lax" | "none" | boolean;
}

export type middleWare = (req: IRequest, res: IResponse, next: () => void) => Promise<any>;

export abstract class ServerPort {
    abstract listen(port: number): void;
    abstract addRouter(methodHttp: methodHttp, path: string, ...callback: middleWare[]): Promise<void>;
    abstract serveStatic(routePrefix: string, folderPath: string): void;
    abstract useGlobalMiddleware(middleware: middleWare): void;
    abstract mountStorefront(): Promise<void>;
}