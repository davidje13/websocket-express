import WebSocketExpress from './WebSocketExpress';
import WebSocketWrapper from './WebSocketWrapper';
import Router from './Router';

export const isWebSocket = WebSocketWrapper.isInstance;

WebSocketExpress.Router = Router;
WebSocketExpress.isWebSocket = isWebSocket;

export default WebSocketExpress;
export {
  Router,
};
