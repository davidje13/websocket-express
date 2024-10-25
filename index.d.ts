declare module 'websocket-express' {
  import { Server } from 'http';
  import * as WebSocket from 'ws';
  import {
    static,
    json,
    urlencoded,
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

  interface NextMessageOptions {
    timeout?: number | undefined;
  }

  interface WebSocketMessage {
    data: Buffer;
    isBinary: boolean;
  }

  export type ExtendedWebSocket = WebSocket & {
    nextMessage(options?: NextMessageOptions): Promise<WebSocketMessage>;
  };

  export interface WSResponse extends Response {
    accept(): Promise<ExtendedWebSocket>;
    reject(code?: number, message?: string | null): void;
    abandon(): void;
    sendError(
      httpStatus: number,
      wsStatus?: number | null,
      message?: string | null,
    ): void;
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

  export type TokenExtractor<P extends Params = ParamsDictionary> = (
    token: string,
    authRealm: string,
    req: Request<P>,
    res: Response,
  ) => Promise<JWTPayload | null> | JWTPayload | null;

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
    | WSRequestHandler<P>
    | WSErrorRequestHandler<P>
    | (WSRequestHandler<P> | WSErrorRequestHandler<P>)[];

  export type PathParams = string | RegExp | (string | RegExp)[];

  export interface WSRouterMatcher<T> {
    <P extends Params = ParamsDictionary>(
      path: PathParams,
      ...handlers: WSRequestHandler<P>[]
    ): T;
    <P extends Params = ParamsDictionary>(
      path: PathParams,
      ...handlers: WSRequestHandlerParams<P>[]
    ): T;
  }

  interface Router extends IRouter {}

  class Router {
    public constructor(options?: RouterOptions);

    public readonly ws: WSRouterMatcher<this>;
    public readonly useHTTP: IRouterHandler<this> & IRouterMatcher<this>;
  }

  interface WebSocketExpress extends Express {}

  class WebSocketExpress {
    public readonly ws: WSRouterMatcher<this>;
    public readonly useHTTP: IRouterHandler<this> & IRouterMatcher<this>;

    public attach(server: Server): void;
    public detach(server: Server): void;
    public createServer(): Server;

    public static readonly static: typeof static;

    public static readonly json: typeof json;

    public static readonly urlencoded: typeof urlencoded;

    public static readonly isWebSocket: typeof isWebSocket;

    public static readonly Router: typeof Router;

    public static readonly requireBearerAuth: typeof requireBearerAuth;

    public static readonly requireAuthScope: typeof requireAuthScope;

    public static readonly getAuthData: typeof getAuthData;

    public static readonly hasAuthScope: typeof hasAuthScope;
  }

  export { Router, WebSocketExpress };
}
