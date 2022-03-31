import { STATUS_CODES } from 'http';

const NONCE = {};

// Copied from https://github.com/websockets/ws/blob/master/lib/websocket-server.js#L374
function abortHandshake(socket, code, message, headers) {
  if (socket.writable) {
    const resolvedMessage = message || STATUS_CODES[code];
    const resolvedHeaders = {
      Connection: 'close',
      'Content-type': 'text/html',
      'Content-Length': Buffer.byteLength(resolvedMessage),
      ...headers,
    };

    socket.write(
      [
        `HTTP/1.1 ${code} ${STATUS_CODES[code]}`,
        ...Object.keys(resolvedHeaders).map(
          (h) => `${h}: ${resolvedHeaders[h]}`,
        ),
        '',
        resolvedMessage,
      ].join('\r\n'),
    );
  }

  socket.destroy();
}

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

    onMessage = (data, isBinary) => {
      detach();
      if (isBinary !== undefined) {
        // ws 8.x
        resolve({ data, isBinary });
      } else if (typeof data === 'string') {
        // ws 7.x
        resolve({ data: Buffer.from(data, 'utf8'), isBinary: false });
      } else {
        resolve({ data, isBinary: true });
      }
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
  // eslint-disable-next-line no-param-reassign
  ws.nextMessage = nextMessage.bind(null, ws);
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
    this.transactionNesting = 0;
    this.closeTimeout = null;
    this.closeTime = 0;
    this.closeTimeoutCode = null;
    this.closeTimeoutMessage = null;
    this.softClosing = false;

    // expressjs builds new objects using properties of response, so all methods
    // must be explicitly added to the instance, not just the class
    this.accept = this.accept;
    this.reject = this.reject;
    this.closeAtTime = this.closeAtTime;
    this.sendError = this.sendError;
    this.setHeader = () => {}; // compatibility with expressjs (fake http.Response API)
    this.status = this.status;
    this.end = this.end;
    this.send = this.send;
    this.beginTransaction = this.beginTransaction;
    this.endTransaction = this.endTransaction;
    this.internalCheckCloseTimeout = this.internalCheckCloseTimeout;
    this.internalSoftClose = this.internalSoftClose;
  }

  static isInstance(o) {
    // expressjs builds new objects using properties of response, so we cannot
    // rely on instanceof checks. Instead we use a nonce property:
    return o && o.nonce === NONCE;
  }

  accept() {
    if (this.closed) {
      return Promise.reject(new Error('Connection closed'));
    }
    if (this.ws) {
      return Promise.resolve(this.ws);
    }

    return new Promise((resolve) =>
      this.wsServer.handleUpgrade(this.req, this.socket, this.head, (ws) => {
        bindExtraMethods(ws);
        ws.on('close', () => clearTimeout(this.closeTimeout));
        this.ws = ws;
        resolve(this.ws);
      }),
    );
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

  internalCheckCloseTimeout() {
    clearTimeout(this.closeTimeout);

    if (this.closed) {
      return;
    }

    const now = Date.now();
    if (now < this.closeTime) {
      this.closeTimeout = setTimeout(
        this.internalCheckCloseTimeout.bind(this),
        Math.min(this.closeTime - now, 1000 * 60 * 60 * 24),
      );
      return;
    }

    this.closed = true;
    if (this.ws) {
      this.ws.close(this.closeTimeoutCode, this.closeTimeoutMessage);
    } else {
      abortHandshake(this.socket, 200, 'Connection time limit reached');
    }
  }

  closeAtTime(time, code = 1001, message = '') {
    if (this.closed) {
      return;
    }
    if (this.closeTimeout !== null && time >= this.closeTime) {
      return;
    }
    this.closeTime = time;
    this.closeTimeoutCode = code;
    this.closeTimeoutMessage = message;
    this.internalCheckCloseTimeout();
  }

  status(code) {
    if (code < 400 && this.ws) {
      throw new Error('Already accepted WebSocket connection');
    }
    this.sendError(code);
    return this;
  }

  end() {
    if (!this.ws && !this.closed) {
      this.sendError(404);
    }
    return this;
  }

  send(message) {
    if (!this.closed) {
      this.accept().then((ws) => {
        ws.send(message);
        ws.close();
      });
      this.closed = true;
    }
    return this;
  }

  beginTransaction() {
    this.transactionNesting += 1;
  }

  endTransaction() {
    if (this.transactionNesting <= 0) {
      throw new Error('Unbalanced endTransaction');
    }
    this.transactionNesting -= 1;

    if (this.transactionNesting === 0 && this.softClosing && !this.closed) {
      this.sendError(500, 1012, 'server shutdown');
    }
  }

  internalSoftClose(limit) {
    if (this.closed) {
      return;
    }

    if (this.transactionNesting > 0) {
      this.softClosing = true;
      if (limit) {
        this.closeAtTime(limit, 1012, 'server shutdown');
      }
    } else {
      this.sendError(500, 1012, 'server shutdown');
    }
  }
}
