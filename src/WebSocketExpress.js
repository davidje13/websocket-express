import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import wrapHandlers, { wrapNonWebsocket } from './wrapHandlers';

const noop = () => {};

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

function wrapWSResponse(websocket) {
  return {
    websocket,
    // compatibility with expressjs (fake http.Response API)
    setHeader: noop,
    end: noop,
  };
}

export default class WebSocketExpress {
  constructor() {
    this.app = express();
    this.locals = this.app.locals;
    this.wsServer = new WebSocket.Server({ noServer: true });

    this.app.use((err, req, res, next) => {
      // error handler: close web socket
      if (res.websocket) {
        res.websocket.close(1011, 'Internal Error');
      }
      next(err);
    });

    this.handleUpgrade = this.handleUpgrade.bind(this);
    this.handleRequest = this.handleRequest.bind(this);
    this.has404 = false;

    FORWARDED_EXPRESS_METHODS.forEach((method) => {
      this[method] = this.app[method].bind(this.app);
    });

    wrapHandlers(this, this.app);
  }

  handleUpgrade(req, socket, head) {
    this.wsServer.handleUpgrade(req, socket, head, (websocket) => {
      this.app(req, wrapWSResponse(websocket));
    });
  }

  handleRequest(req, res) {
    return this.app(req, res);
  }

  attach(server) {
    if (!this.has404) {
      this.has404 = true;
      this.app.use((req, res, next) => {
        // 404 handler: close web socket (must be last handler)
        if (res.websocket) {
          res.websocket.close(4404, 'Not Found');
        } else {
          next();
        }
      });
    }
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
