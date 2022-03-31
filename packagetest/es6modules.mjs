import defaultImport, { isWebSocket, Router } from 'websocket-express';

if (typeof defaultImport !== 'function') {
  throw new Error("import 'websocket-express' did not return WebSocketExpress class");
}

if (typeof defaultImport().listen !== 'function') {
  throw new Error("import 'websocket-express' did not return WebSocketExpress class");
}

if (typeof isWebSocket !== 'function') {
  throw new Error("import {isWebSocket} from 'websocket-express' did not return function");
}

if (typeof defaultImport.isWebSocket !== 'function') {
  throw new Error("import 'websocket-express' isWebSocket did not return function");
}

if (typeof Router !== 'function') {
  throw new Error("import {Router} from 'websocket-express' did not return Router class");
}
