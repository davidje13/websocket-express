import request from 'superwstest';
import WebSocket from 'ws';
import { WebSocketExpress, Router, isWebSocket } from './index.mjs';
import runServer from './runServer.mjs';

function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

function makeTestServer() {
  const app = new WebSocketExpress();
  const router = new Router();

  router.get('/path/get', (req, res) => {
    res.end('get-output');
  });

  router.get(
    '/path/get/fail',
    (req, res) => {
      throw new Error('nope');
    },
    (err, req, res, next) => {
      res.end('caught ' + err.message);
    },
  );

  const errorHandlingRouter = new Router();
  errorHandlingRouter.get('/', async (req, res) => {
    throw new Error('async nope');
  });
  errorHandlingRouter.use((err, req, res, next) => {
    res.end('caught ' + err.message);
  });

  router.use('/path/get/async-fail', errorHandlingRouter);

  router.ws('/path/ws', async (req, res) => {
    const ws = await res.accept();
    ws.on('message', (msg) => {
      ws.send(`echo ${msg}`);
    });
    ws.send('hello');
  });

  router.ws('/path/abandon', (req, res) => {
    res.abandon();
  });

  router.get('/path/multi', (req, res) => {
    res.send('http');
  });

  router.ws('/path/multi', (req, res) => {
    res.send('ws');
  });

  router.use('/path/all-in-one', (req, res) => {
    if (isWebSocket(res)) {
      res.send('ws');
    } else {
      res.send('http');
    }
  });

  router.ws('/path/reject-ws', (req, res, next) => {
    next();
  });

  router.ws('/path/explicit-reject-ws', (req, res) => {
    res.reject();
  });

  router.ws('/path/ws-async', async (req, res) => {
    await sleep(100);
    const ws = await res.accept();
    ws.send('hello');
  });

  router.ws('/path/reject-ws-async', async (req, res, next) => {
    await sleep(100);
    next();
  });

  router.ws('/path/explicit-reject-ws-async', async (req, res) => {
    await sleep(100);
    res.reject();
  });

  app.use(router);

  return app.createServer();
}

describe('WebSocketExpress routing', () => {
  const S = beforeEach(({ setParameter }) => {
    const server = makeTestServer();
    setParameter(server);
    return runServer(server);
  });

  describe('get', () => {
    it('returns response from handler', async ({ [S]: server }) => {
      const response = await request(server).get('/path/get').expect(200);

      expect(response.text).toEqual('get-output');
    });

    it('does not respond to websocket connections', async ({ [S]: server }) => {
      await request(server).ws('/path/get').expectConnectionError(404);
    });

    it('supports passing error handlers', async ({ [S]: server }) => {
      const response = await request(server).get('/path/get/fail').expect(200);

      expect(response.text).toEqual('caught nope');
    });

    it('handles asynchronous errors', async ({ [S]: server }) => {
      const response = await request(server)
        .get('/path/get/async-fail')
        .expect(200);

      expect(response.text).toEqual('caught async nope');
    });
  });

  describe('ws', () => {
    it('responds to websocket connections', async ({ [S]: server }) => {
      await request(server)
        .ws('/path/ws')
        .expectText('hello')
        .send('foo')
        .expectText('echo foo')
        .send('abc')
        .expectText('echo abc')
        .close()
        .expectClosed();
    });

    it('does not respond to HTTP requests', async ({ [S]: server }) => {
      await request(server).get('/path/ws').expect(404);
    });

    it('does not respond to rejected connections', async ({ [S]: server }) => {
      await request(server).ws('/path/reject-ws').expectConnectionError(404);
    });

    it('rejects connection if handler rejects', async ({ [S]: server }) => {
      await request(server)
        .ws('/path/explicit-reject-ws')
        .expectConnectionError(500);
    });

    it('returns HTTP 404 for unknown URLs', async ({ [S]: server }) => {
      await request(server).ws('/path/nope').expectConnectionError(404);
    });

    it('responds to asynchronously accepted connections', async ({
      [S]: server,
    }) => {
      await request(server)
        .ws('/path/ws-async')
        .expectText('hello')
        .close()
        .expectClosed();
    });

    it('does not respond to asynchronously rejected connections', async ({
      [S]: server,
    }) => {
      await request(server)
        .ws('/path/reject-ws-async')
        .expectConnectionError(404);
    });

    it('rejects connection asynchronously if handler rejects', async ({
      [S]: server,
    }) => {
      await request(server)
        .ws('/path/explicit-reject-ws-async')
        .expectConnectionError(500);
    });
  });

  describe('multiple routes on same URL', () => {
    it('uses dedicated handlers for HTTP connections', async ({
      [S]: server,
    }) => {
      const response = await request(server).get('/path/multi').expect(200);

      expect(response.text).toEqual('http');
    });

    it('uses dedicated handlers for websocket connections', async ({
      [S]: server,
    }) => {
      await request(server)
        .ws('/path/multi')
        .expectText('ws')
        .close()
        .expectClosed();
    });

    it('uses shared handlers for HTTP connections', async ({ [S]: server }) => {
      const response = await request(server)
        .get('/path/all-in-one')
        .expect(200);

      expect(response.text).toEqual('http');
    });

    it('uses shared handlers for websocket connections', async ({
      [S]: server,
    }) => {
      await request(server)
        .ws('/path/all-in-one')
        .expectText('ws')
        .close()
        .expectClosed();
    });
  });

  describe('abandon', () => {
    it('restores the request URL', async ({ [S]: server }) => {
      let capturedUrl;
      server.on('upgrade', (req, socket) => {
        capturedUrl = req.url;
        socket.destroy();
      });
      await request(server).ws('/path/abandon').expectConnectionError();
      expect(capturedUrl).toEqual('/path/abandon');
    });

    it('does not interfere with the connection', async ({ [S]: server }) => {
      const wsServer = new WebSocket.Server({ noServer: true });
      server.on('upgrade', (req, socket, head) => {
        wsServer.handleUpgrade(req, socket, head, (ws) => {
          ws.send('hello');
          ws.close();
        });
      });

      await request(server)
        .ws('/path/abandon')
        .expectText('hello')
        .expectClosed();
    });

    it('does not close the connection on server close', async ({
      [S]: server,
    }) => {
      const wsServer = new WebSocket.Server({ noServer: true });
      server.on('upgrade', (req, socket, head) => {
        wsServer.handleUpgrade(req, socket, head, async (ws) => {
          ws.send('hello');
          await sleep(100);
          ws.send('delayed');
        });
      });

      await request(server, { shutdownDelay: 1000 })
        .ws('/path/abandon')
        .expectText('hello')
        .exec(() => new Promise((resolve) => server.close(resolve)))
        .expectText('delayed')
        .close()
        .expectClosed();
    });
  });
});
