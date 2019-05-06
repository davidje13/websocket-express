import { STATUS_CODES } from 'http';

const NONCE = {};

// Copied from https://github.com/websockets/ws/blob/master/lib/websocket-server.js#L374
/* eslint-disable no-param-reassign, comma-dangle, prefer-template */
function abortHandshake(socket, code, message, headers) {
  if (socket.writable) {
    message = message || STATUS_CODES[code];
    headers = {
      Connection: 'close',
      'Content-type': 'text/html',
      'Content-Length': Buffer.byteLength(message),
      ...headers
    };

    socket.write(
      `HTTP/1.1 ${code} ${STATUS_CODES[code]}\r\n` +
        Object.keys(headers)
          .map((h) => `${h}: ${headers[h]}`)
          .join('\r\n') +
        '\r\n\r\n' +
        message
    );
  }

  socket.destroy();
}
/* eslint-enable no-param-reassign, comma-dangle, prefer-template */

function httpStatusToWs(code) {
  if (code >= 500) {
    return 1011;
  }
  return 4000 + code;
}

function nextMessage(ws, { timeout = 0 } = {}) {
  return new Promise((resolve, reject) => {
    let onMessage = null;
    let onClose = null;
    let exp = null;

    const detach = () => {
      ws.off('message', onMessage);
      ws.off('close', onClose);
      clearTimeout(exp);
    };

    onMessage = (msg) => {
      detach();
      resolve(msg);
    };

    onClose = () => {
      detach();
      reject();
    };

    ws.on('message', onMessage);
    ws.on('close', onClose);
    if (timeout > 0) {
      exp = setTimeout(onClose, timeout);
    }
  });
}

function bindExtraMethods(ws) {
  /* eslint-disable no-param-reassign */
  ws.nextMessage = nextMessage.bind(null, ws);
  /* eslint-enable no-param-reassign */
}

export default class WebSocketWrapper {
  constructor(wsServer, req, socket, head) {
    this.wsServer = wsServer;
    this.req = req;
    this.socket = socket;
    this.head = head;
    this.ws = null;
    this.closed = false;
    this.nonce = NONCE;

    // expressjs builds new objects using properties of response, so all methods
    // must be explicitly added to the instance, not just the class
    this.accept = this.accept;
    this.reject = this.reject;
    this.sendError = this.sendError;
    this.setHeader = () => {}; // compatibility with expressjs (fake http.Response API)
    this.status = this.status;
    this.end = this.end;
  }

  static isInstance(o) {
    // expressjs builds new objects using properties of response, so we cannot
    // rely on instanceof checks. Instead we use a nonce property:
    return o && (o.nonce === NONCE);
  }

  accept() {
    if (this.ws) {
      return Promise.reject(new Error('Already accepted WebSocket connection'));
    }
    if (this.closed) {
      return Promise.reject(new Error('Connection closed'));
    }

    return new Promise((resolve) => this.wsServer.handleUpgrade(
      this.req,
      this.socket,
      this.head,
      (ws) => {
        bindExtraMethods(ws);
        this.ws = ws;
        resolve(this.ws);
      },
    ));
  }

  reject(code = 500, message = null) {
    if (this.ws) {
      throw new Error('Already accepted WebSocket connection');
    }
    this.sendError(code, null, message);
  }

  sendError(httpStatus, wsStatus = null, message = null) {
    if (this.closed) {
      throw new Error('Connection closed');
    }

    const msg = message || STATUS_CODES[httpStatus];

    this.closed = true;
    if (this.ws) {
      this.ws.close(wsStatus || httpStatusToWs(httpStatus), msg);
    } else {
      abortHandshake(this.socket, httpStatus, msg);
    }
  }

  status(code) {
    this.reject(code);
  }

  end() {
    if (!this.ws && !this.closed) {
      this.sendError(404);
    }
  }
}
