const defaultRequire = require('websocket-express');
const { isWebSocket, Router } = defaultRequire;

if (typeof defaultRequire !== 'function') {
  throw new Error("require('websocket-express') did not return WebSocketExpress class");
}

if (typeof defaultRequire.default !== 'function') {
  throw new Error("require('websocket-express').default did not return WebSocketExpress class");
}

if (typeof defaultRequire().listen !== 'function') {
  throw new Error("require('websocket-express') did not return WebSocketExpress class");
}

if (typeof isWebSocket !== 'function') {
  throw new Error("require('websocket-express').isWebSocket did not return function");
}

if (typeof Router !== 'function') {
  throw new Error("require('websocket-express').Router did not return Router class");
}
