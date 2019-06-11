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
npm install --save git+https://github.com/davidje13/websocket-express.git#semver:^1.3.3
```

## Usage

```javascript
import WebSocketExpress, { Router } from 'websocket-express';

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
  ws.send(`hello, ${message}`);

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

// Full Router API of express is supported too:
router.get('/path/foo', (req, res) => {
  res.end('response to a normal HTTP GET request');
});

// use sends both HTTP and WS requests to the middleware / router:
app.use(router);

// useHTTP allows attaching middleware only to HTTP requests:
app.useHTTP(middleware);

const server = app.createServer();
server.listen(8080);
```

If you have a vanilla express `Router` or middleware (e.g. from an
external library), it is recommended to use `useHTTP` rather than `use`
to attach it, to ensure it is not confused by WebSocket requests.

The `static`, `json` and `urlencoded` middleware is bundled by default
and ignores WebSocket requests, so `use` is fine:

```javascript
import WebSocketExpress from 'websocket-express';

const app = new WebSocketExpress();
app.use(WebSocketExpress.static(myDirectory));
```

## API

The main method is `Router.ws`. This accepts a (possibly asynchronous)
function with 3 parameters; the request, the response, and a `next`
callback to be invoked if the request is rejected for any reason.

If the request is accepted, the function should call `accept` to get a
WebSocket, attach `message` and `close` event listeners and can
continue to handle the WebSocket as normal.

If the request is rejected, `next` should be called (possibly with an
error description), and the next possible handler, or the error
handler, will be called (according to the standard express logic).

If no handlers are able to accept a WebSocket request, it will be
closed (with code 4404 by default).

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
  server.

- `App.detach` will remove all attached event listeners from the given
  server.

The returned WebSocket has some additional helper methods:

- `ws.nextMessage` will return a promise which resolves with the next
  message received by the websocket. If the socket closes before a
  message arrives, the promise will be rejected. You can also specify
  a timeout (with `nextMessage({ timeout: millis })`) to reject if no
  message is received within the requested time.
