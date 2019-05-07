import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import WebSocketWrapper from './WebSocketWrapper';
import wrapHandlers, { wrapNonWebsocket } from './wrapHandlers';

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

const FORWARDED_HTTP_MIDDLEWARE = [
  'static',
  'json',
  'urlencoded',
];

export default class WebSocketExpress {
  constructor(...args) {
    this.app = express(...args);
    this.locals = this.app.locals;
    this.wsServer = new WebSocket.Server({ noServer: true });

    this.app.use((err, req, res, next) => {
      // error handler: close web socket
      if (WebSocketWrapper.isInstance(res)) {
        res.sendError(500);
      }
      next(err);
    });

    this.handleUpgrade = this.handleUpgrade.bind(this);
    this.handleRequest = this.handleRequest.bind(this);

    FORWARDED_EXPRESS_METHODS.forEach((method) => {
      this[method] = this.app[method].bind(this.app);
    });

    wrapHandlers(this, this.app);
  }

  handleUpgrade(req, socket, head) {
    const wrap = new WebSocketWrapper(this.wsServer, req, socket, head);
    return this.app(req, wrap);
  }

  handleRequest(req, res) {
    return this.app(req, res);
  }

  attach(server) {
    server.on('upgrade', this.handleUpgrade);
    server.on('request', this.handleRequest);
  }

  detach(server) {
    server.removeListener('upgrade', this.handleUpgrade);
    server.removeListener('request', this.handleRequest);
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
  WebSocketExpress[middleware] = (...args) => wrapNonWebsocket(
    express[middleware](...args),
  );
});
