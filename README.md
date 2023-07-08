# WebSocket Express

Extends [express](https://expressjs.com/) with WebSocket capabilities
from [ws](https://github.com/websockets/ws). This allows an easy syntax
for handling WebSockets as well as allowing a single server to handle
both HTTP and WebSocket requests.

This project is similar to (and takes some inspiration from
[express-ws](https://github.com/HenningM/express-ws), but chooses to
provide a separate API rather than monkeypatching the express objects,
and supports asynchronous operations in all locations.

## Install dependency

```bash
npm install --save websocket-express ws express @types/ws @types/express
```

(`ws` and `express` are required as peer dependencies of
`websocket-express`. You can use `express` version 4 or 5.
`@types/ws` and `@types/express` must be added even if you
are not using TypeScript in your project)

## Usage

```javascript
import { WebSocketExpress, Router } from 'websocket-express';

const app = new WebSocketExpress();
const router = new Router();

// Simple usage:
router.ws('/path/foo', async (req, res) => {
  const ws = await res.accept();
  ws.on('message', (msg) => {
    ws.send(`echo ${msg}`);
  });
  ws.send('hello');
});

router.ws('/path/bar', async (req, res) => {
  const ws = await res.accept();

  ws.send('who are you?');

  const message = await ws.nextMessage({ timeout: 1000 });
  ws.send(`hello, ${message.data}`);

  ws.close();
});

// Asynchronous accept/reject:
router.ws('/path/ws-async', async (req, res, next) => {
  const acceptable = await myAsynchronousOperation();
  if (acceptable) {
    const ws = await res.accept();
    ws.send('hello');
  } else {
    next();
  }
});

// Transactions:
router.ws('/path/transactional', async (req, res) => {
  const ws = await res.accept();

  try {
    res.beginTransaction();
    ws.send('hello');
    ws.send('this is a long series of messages');
    ws.send('and all messages will be sent');
    ws.send('even if the server is asked to close()');
    ws.send('although they may be stopped if the server crashes');

    await myAsynchronousOperation();

    ws.send('still included');
  } finally {
    res.endTransaction();
  }

  ws.send('this message might not be included');
  ws.send('because the transaction has finished');
});

// Full Router API of express is supported too:
router.get('/path/foo', (req, res) => {
  res.end('response to a normal HTTP GET request');
});

// use sends both HTTP and WS requests to the middleware / router:
app.use(router);

// useHTTP allows attaching middleware only to HTTP requests:
app.useHTTP(middleware);

// the setting 'shutdown timeout' can be set to automatically close
// WebSocket connections after a delay, even if they are in a
// transaction
app.set('shutdown timeout', 1000);

// create and run a server:
const server = app.createServer();
server.listen(8080);

// or attach to an existing server:
const server = http.createServer();
app.attach(server);
server.listen(8080);
```

If you have a vanilla express `Router` or middleware (e.g. from an
external library), it is recommended to use `useHTTP` rather than `use`
to attach it, to ensure it is not confused by WebSocket requests.

The `static`, `json` and `urlencoded` middleware is bundled by default
and ignores WebSocket requests, so `use` is fine:

```javascript
import { WebSocketExpress } from 'websocket-express';

const app = new WebSocketExpress();
app.use(WebSocketExpress.static(myDirectory));
```

Example integration with an external websocket server library (socket.io):

```javascript
import { Server } from 'socket.io';
import { WebSocketExpress } from 'websocket-express';

const app = new WebSocketExpress();
app.ws('/socket.io/*', (req, res) => res.abandon()); // /socket.io requests are handled by socketioServer
// register other websocket and non-websocket endpoints as normal

const server = app.createServer();
const socketioServer = new Server(server);
// configure socketioServer as normal

server.listen(8080);
```

Note that if you `abandon` a request which is _not_ handled by another
library, the connection will hang until the client eventually times out.
This may be particularly problematic when shutting down the server:
`websocket-express` will normally close all remaining websocket
connections automatically when `server.close` is called, but it will
not close abandoned connections. This may delay the process termination,
as NodeJS will remain active as long as any connections are open.

## API

The main method is `Router.ws`. This accepts a (possibly asynchronous)
function with 3 parameters: the request, the response, and a `next`
callback to be invoked if the request is rejected for any reason.

If the request is accepted, the function should call `accept` to get a
WebSocket, attach `message` and `close` event listeners and can
continue to handle the WebSocket as normal.

If the request is rejected, `next` should be called (possibly with an
error description), and the next possible handler, or the error
handler, will be called (according to the standard express logic).

If no handlers are able to accept a WebSocket request, it will be
closed (with code 4404 by default). If you want another library to
handle the request (e.g. socket.io), you can call `abandon` to stop
any further handling of the request.

If an exception is thrown, the socket will be closed with code 1011.

As with `get` / `post` / etc. it is possible to register a WebSocket
handler under the same URL as a non-websocket handler.

- `Router.useHTTP` / `App.useHTTP` behaves like `Router.use` in
  express. It will invoke the middleware or router for all
  non-WebSocket requests.

- `Router.all` is similarly updated to apply only to non-WebSocket
  requests.

- `Router.use` / `App.use` will invoke the middleware or router for
  *all* requests.

- `Router.ws` will invoke the middleware only for WebSocket requests.

- `App.createServer` is a convenience method which creates a server and
  calls `attach` (see below).

- `App.attach` will attach the necessary event listeners to the given
  server (e.g. if you want to use a https server, or a long-lived
  server with hot reloading).

- `App.detach` will remove all attached event listeners from the given
  server.

- `App.set('shutdown timeout', millis)` configures a timeout (in
  milliseconds) used by `close()`, after which connections will be
  forced to close even if they are in a transaction.

The `response` parameter passed to websocket handlers has additional
methods:

- `res.accept()` accepts the protocol switch, establishing the
  websocket connection. This returns a promise which resolves to the
  newly established websocket.

- `res.reject([httpStatus[, message]])` returns a HTTP error instead
  of accepting the websocket connection. Defaults to HTTP 500.

- `res.abandon()` stops all further processing of the connection. This
  should be used if you want to delegate to another library which has
  also registered an `upgrade` listener on the server. Note that this
  is provided as an escape hatch; in general you should try to
  `accept` the connection and pass the websocket to other libraries,
  as this will handle lifecycle events (such as closing the server)
  more gracefully.

- `res.sendError(httpStatus[, websocketErrorCode[, message]])` sends
  a HTTP or websocket error and closes the connection. If no explicit
  websocket error code is provided and the websocket connection has
  already been established, this will default to `4000 + httpStatus`
  (e.g. HTTP 404 becomes websocket error 4404).

- `res.send(message)` shorthand for accepting the connection, sending
  a message, then closing the connection. Provided for compatibility
  with the `express` API.

- `res.beginTransaction()` / `res.endTransaction()` mark (nestable)
  transactions on the websocket connection. While a transaction is
  active, `websocket-express` will avoid closing the connection
  (e.g. during server shutdown). These should be used to wrap
  short-lived sequences of messages which need to be sent together.
  Do not use these for long-lived operations, as it will delay
  server shutdown. To ensure `endTransaction` is called, it is
  recommended that you use the pattern:

  ```javascript
  try {
    res.beginTransaction();
    // transaction code
  } finally {
    res.endTransaction();
  }
  ```

The WebSocket returned by `accept` has some additional helper methods:

- `ws.nextMessage` will return a promise which resolves with the next
  message received by the websocket. If the socket closes before a
  message arrives, the promise will be rejected. You can also specify
  a timeout (with `nextMessage({ timeout: millis })`) to reject if no
  message is received within the requested time.

  The object returned by `nextMessage` has a `data` element (a
  `String` if using `ws` 7.x and the message is text, or a `Buffer`
  if the message is binary, or if using `ws` 8.x), and an `isBinary`
  boolean. You can use `String(message.data)` to convert the `Buffer`
  to a string using UTF8 encoding, matching `ws` 7.x's behaviour.
