declare module 'websocket-express' {
  import { Server } from 'http';
  import * as WebSocket from 'ws';
  import express, {
    Request,
    Response,
    IRouterHandler,
    IRouterMatcher,
    NextFunction,
    RequestHandler,
    IRouter,
    RouterOptions,
    Express,
  } from 'express';
  import { Params, ParamsDictionary } from 'express-serve-static-core';

  export interface WSResponse extends Response {
    accept(): Promise<WebSocket>;
    reject(code?: number, message?: string | null): void;
    sendError(httpStatus: number, wsStatus?: number | null, message?: string | null): void;
    closeAtTime(time: number, code?: number, message?: string): void;
    send(message: string): this;
    beginTransaction(): void;
    endTransaction(): void;
  }

  export function isWebSocket(res: Response): res is WSResponse;

  export interface JWTPayload {
    iss?: string;
    iat?: number;
    nbf?: number;
    exp?: number;
    sub?: string;
    aud?: string;
    jti?: string;
    scopes?: string[] | { [scope: string]: boolean } | string;
  }

  type TokenExtractor<P extends Params = ParamsDictionary> = (
    token: string,
    authRealm: string,
    req: Request<P>,
    res: Response,
  ) => (Promise<JWTPayload | null> | JWTPayload | null);

  export function requireBearerAuth<P extends Params = ParamsDictionary>(
    realm: ((req: Request<P>, res: Response) => string) | string,
    extractAndValidateToken: TokenExtractor<P>,
  ): RequestHandler<P>;
  export function requireAuthScope(scope: string): RequestHandler<any>;
  export function getAuthData(res: Response): JWTPayload;
  export function hasAuthScope(res: Response, scope: string): boolean;

  export type WSRequestHandler<P extends Params = ParamsDictionary> = (
    req: Request<P>,
    res: WSResponse,
    next: NextFunction,
  ) => any;

  export type WSErrorRequestHandler<P extends Params = ParamsDictionary> = (
    err: any,
    req: Request<P>,
    res: WSResponse,
    next: NextFunction,
  ) => any;

  export type WSRequestHandlerParams<P extends Params = ParamsDictionary> =
    WSRequestHandler<P> |
    WSErrorRequestHandler<P> |
    (WSRequestHandler<P> | WSErrorRequestHandler<P>)[];

  export type PathParams = string | RegExp | (string | RegExp)[];

  export interface WSRouterMatcher<T> {
    <P extends Params = ParamsDictionary>(path: PathParams, ...handlers: WSRequestHandler<P>[]): T;
    <P extends Params = ParamsDictionary>(path: PathParams, ...handlers: WSRequestHandlerParams<P>[]): T;
  }

  interface Router extends IRouter {
    ws: WSRouterMatcher<this>;
    useHTTP: IRouterHandler<this> & IRouterMatcher<this>;
  }

  class Router {
    public constructor(options?: RouterOptions);
  }

  interface WebSocketExpress extends Express {
    ws: WSRouterMatcher<this>;
    useHTTP: IRouterHandler<this> & IRouterMatcher<this>;

    attach(server: Server): void;
    detach(server: Server): void;
    createServer(): Server;
  }

  class WebSocketExpress {
    public static static: typeof express.static;

    public static json: typeof express.json;

    public static urlencoded: typeof express.urlencoded;

    public static isWebSocket: typeof isWebSocket;

    public static Router: typeof Router;

    public static requireBearerAuth: typeof requireBearerAuth;

    public static requireAuthScope: typeof requireAuthScope;

    public static getAuthData: typeof getAuthData;

    public static hasAuthScope: typeof hasAuthScope;
  }

  export { Router, WebSocket };
  export default WebSocketExpress;
}
