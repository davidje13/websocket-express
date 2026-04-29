import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import WebSocketWrapper from './WebSocketWrapper.mjs';
import wrapHandlers, { wrapNonWebsocket } from './wrapHandlers.mjs';

const FORWARDED_EXPRESS_METHODS = [
  'enable',
  'enabled',
  'disable',
  'disabled',
  'set',
  'get',
  'engine',
  'path',
];

const FORWARDED_HTTP_MIDDLEWARE = ['static', 'json', 'urlencoded'];

function addPreCloseEvent(server) {
  if (server.close.hasPreCloseEvent) {
    return;
  }

  const originalClose = server.close.bind(server);
  const wrappedClose = (callback) => {
    server.emit('pre-close', server);
    originalClose(callback);
  };
  wrappedClose.hasPreCloseEvent = true;

  /* eslint-disable-next-line no-param-reassign */ // close interception
  server.close = wrappedClose;
}

function bindWithOriginalThis(fn, thisArg) {
  return function wrapped(...args) {
    return fn.call(thisArg, this, ...args);
  };
}

export default class WebSocketExpress {
  constructor(...args) {
    this.app = express(...args);
    this.locals = this.app.locals;
    this.wsServer = new WebSocketServer({ noServer: true });
    this.activeWebSockets = new WeakMap();

    this.app.use((err, req, res, next) => {
      // error handler: close web socket
      if (WebSocketWrapper.isInstance(res)) {
        res.sendError(500);
      }
      next(err);
    });

    this.handleUpgrade = bindWithOriginalThis(this.handleUpgrade, this);
    this.handleRequest = this.handleRequest.bind(this);
    this.handlePreClose = this.handlePreClose.bind(this);

    FORWARDED_EXPRESS_METHODS.forEach((method) => {
      this[method] = this.app[method].bind(this.app);
    });

    wrapHandlers(this, this.app);
  }

  handleUpgrade(server, req, socket, head) {
    const wrap = new WebSocketWrapper(this.wsServer, req, socket, head);

    const socketSet = this.activeWebSockets.get(server);
    socketSet.add(wrap);
    socket.on('close', () => socketSet.delete(wrap));

    return this.app(req, wrap);
  }

  handleRequest(req, res) {
    return this.app(req, res);
  }

  handlePreClose(server) {
    let expiry = 0;
    const shutdownTimeout = this.app.get('shutdown timeout');
    if (typeof shutdownTimeout === 'number' && shutdownTimeout >= 0) {
      expiry = Date.now() + shutdownTimeout;
    }
    const socketSet = this.activeWebSockets.get(server);
    [...socketSet].forEach((s) => s.internalSoftClose(expiry));
  }

  attach(server) {
    if (this.activeWebSockets.has(server)) {
      throw new Error('Cannot attach to the same server multiple times');
    }
    this.activeWebSockets.set(server, new Set());
    addPreCloseEvent(server);
    server.on('upgrade', this.handleUpgrade);
    server.on('request', this.handleRequest);
    server.on('pre-close', this.handlePreClose);
  }

  detach(server) {
    if (!this.activeWebSockets.has(server)) {
      return; // not attached
    }
    server.removeListener('upgrade', this.handleUpgrade);
    server.removeListener('request', this.handleRequest);
    server.removeListener('pre-close', this.handlePreClose);
    this.handlePreClose(server);
    this.activeWebSockets.delete(server);
  }

  createServer() {
    const server = http.createServer();
    this.attach(server);
    return server;
  }

  listen(...args) {
    const server = this.createServer();
    return server.listen(...args);
  }
}

FORWARDED_HTTP_MIDDLEWARE.forEach((middleware) => {
  WebSocketExpress[middleware] = (...args) =>
    wrapNonWebsocket(express[middleware](...args));
  Object.assign(WebSocketExpress[middleware], express[middleware]);
});
