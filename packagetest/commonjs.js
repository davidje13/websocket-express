const defaultRequire = require('websocket-express');
const { WebSocketExpress, isWebSocket, Router } = defaultRequire;

if (typeof WebSocketExpress !== 'function') {
  throw new Error(
    "require('websocket-express').WebSocketExpress did not return WebSocketExpress class",
  );
}

if (typeof new WebSocketExpress().listen !== 'function') {
  throw new Error(
    "require('websocket-express').WebSocketExpress did not return WebSocketExpress class",
  );
}

if (typeof isWebSocket !== 'function') {
  throw new Error(
    "require('websocket-express').isWebSocket did not return function",
  );
}

if (typeof WebSocketExpress.isWebSocket !== 'function') {
  throw new Error(
    "require('websocket-express').isWebSocket did not return function",
  );
}

if (typeof Router !== 'function') {
  throw new Error(
    "require('websocket-express').Router did not return Router class",
  );
}
