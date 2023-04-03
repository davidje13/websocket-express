import { WebSocketExpress, isWebSocket, Router } from 'websocket-express';

if (typeof WebSocketExpress !== 'function') {
  throw new Error(
    "import {WebSocketExpress} from 'websocket-express' did not return WebSocketExpress class",
  );
}

if (typeof new WebSocketExpress().listen !== 'function') {
  throw new Error(
    "import {WebSocketExpress} from 'websocket-express' did not return WebSocketExpress class",
  );
}

if (typeof isWebSocket !== 'function') {
  throw new Error(
    "import {isWebSocket} from 'websocket-express' did not return function",
  );
}

if (typeof WebSocketExpress.isWebSocket !== 'function') {
  throw new Error(
    "import {WebSocketExpress} 'websocket-express' isWebSocket did not return function",
  );
}

if (typeof Router !== 'function') {
  throw new Error(
    "import {Router} from 'websocket-express' did not return Router class",
  );
}
