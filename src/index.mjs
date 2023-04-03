import WebSocketExpress from './WebSocketExpress.mjs';
import WebSocketWrapper from './WebSocketWrapper.mjs';
import Router from './Router.mjs';
import {
  requireBearerAuth,
  requireAuthScope,
  getAuthData,
  hasAuthScope,
} from './auth.mjs';

const isWebSocket = WebSocketWrapper.isInstance;

WebSocketExpress.Router = Router;
WebSocketExpress.isWebSocket = isWebSocket;
WebSocketExpress.requireBearerAuth = requireBearerAuth;
WebSocketExpress.requireAuthScope = requireAuthScope;
WebSocketExpress.getAuthData = getAuthData;
WebSocketExpress.hasAuthScope = hasAuthScope;

export {
  WebSocketExpress,
  Router,
  isWebSocket,
  requireBearerAuth,
  requireAuthScope,
  getAuthData,
  hasAuthScope,
};
