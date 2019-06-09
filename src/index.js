import WebSocketExpress from './WebSocketExpress';
import WebSocketWrapper from './WebSocketWrapper';
import Router from './Router';
import { requireBearerAuth, requireAuthScope, hasAuthScope } from './auth';

export const isWebSocket = WebSocketWrapper.isInstance;

WebSocketExpress.Router = Router;
WebSocketExpress.isWebSocket = isWebSocket;
WebSocketExpress.requireBearerAuth = requireBearerAuth;
WebSocketExpress.requireAuthScope = requireAuthScope;
WebSocketExpress.hasAuthScope = hasAuthScope;

export default WebSocketExpress;
export {
  Router,
  requireBearerAuth,
  requireAuthScope,
  hasAuthScope,
};
