declare module 'websocket-express' {
  import { Server } from 'http';
  import * as WebSocket from 'ws';
  import {
    Request,
    Response,
    IRouterMatcher,
    NextFunction,
    RequestHandler,
    IRouter,
    RouterOptions,
    Express,
  } from 'express';

  export interface WSResponse extends Response {
    accept(): Promise<WebSocket>;
    reject(code?: number, message?: string | null): void;
    sendError(httpStatus: number, wsStatus?: number | null, message?: string | null): void;
    closeAtTime(time: number, code?: number, message?: string): void;
    send(message: string): this;
  }

  export function isWebSocket(res: Response): res is WSResponse;

  export interface JWTPayload {
    nbf?: number;
    exp?: number;
    sub?: string;
    aud?: string;
    scopes?: string[] | { [scope: string]: boolean } | string;
  }

  type TokenExtractor = (
    token: string,
    authRealm: string,
    req: Request,
    res: Response,
  ) => (Promise<JWTPayload | null> | JWTPayload | null);

  export function requireBearerAuth(
    realm: ((req: Request, res: Response) => string) | string,
    extractAndValidateToken: TokenExtractor,
  ): RequestHandler;
  export function requireAuthScope(scope: string): RequestHandler;
  export function getAuthData(res: Response): JWTPayload;
  export function hasAuthScope(res: Response, scope: string): boolean;

  type WSRequestHandler = (
    req: Request,
    res: WSResponse,
    next: NextFunction,
  ) => any;

  export type WSErrorRequestHandler = (
    err: any,
    req: Request,
    res: WSResponse,
    next: NextFunction,
  ) => any;

  export type WSRequestHandlerParams =
    WSRequestHandler |
    WSErrorRequestHandler |
    (WSRequestHandler | WSErrorRequestHandler)[];

  export type PathParams = string | RegExp | (string | RegExp)[];

  export interface WSRouterMatcher<T> {
    (path: PathParams, ...handlers: WSRequestHandler[]): T;
    (path: PathParams, ...handlers: WSRequestHandlerParams[]): T;
  }

  interface Router extends IRouter<any> {
    ws: WSRouterMatcher<this>;
    useHTTP: IRouterMatcher<this>;
  }

  class Router {
    public constructor(options?: RouterOptions);
  }

  interface WebSocketExpress extends Express {
    ws: IRouterMatcher<this>;
    useHTTP: IRouterMatcher<this>;

    attach(server: Server): void;
    detach(server: Server): void;
    createServer(): Server;
  }

  class WebSocketExpress {
    public static urlencoded(options?: { extended?: boolean }): RequestHandler;

    public static json(options?: { limit?: number }): RequestHandler;
  }

  export { Router, WebSocket };
  export default WebSocketExpress;
}
