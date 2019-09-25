import request from 'superwstest';
import WebSocketExpress, { Router, isWebSocket } from '.';

function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

function makeTestServer() {
  const app = new WebSocketExpress();
  const router = new Router();

  router.get('/path/get', (req, res) => {
    res.end('get-output');
  });

  router.ws('/path/ws', async (req, res) => {
    const ws = await res.accept();
    ws.on('message', (msg) => {
      ws.send(`echo ${msg}`);
    });
    ws.send('hello');
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
  let server;

  beforeEach((done) => {
    server = makeTestServer();
    server.listen(0, 'localhost', done);
  });

  afterEach((done) => {
    server.close(done);
  });

  describe('get', () => {
    it('returns response from handler', async () => {
      const response = await request(server)
        .get('/path/get')
        .expect(200);

      expect(response.text).toEqual('get-output');
    });

    it('does not respond to websocket connections', async () => {
      await request(server)
        .ws('/path/get')
        .expectConnectionError(404);
    });
  });

  describe('ws', () => {
    it('responds to websocket connections', async () => {
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

    it('does not respond to HTTP requests', async () => {
      await request(server)
        .get('/path/ws')
        .expect(404);
    });

    it('does not respond to rejected connections', async () => {
      await request(server)
        .ws('/path/reject-ws')
        .expectConnectionError(404);
    });

    it('rejects connection if handler rejects', async () => {
      await request(server)
        .ws('/path/explicit-reject-ws')
        .expectConnectionError(500);
    });

    it('returns a HTTP not found status for unknown URLs', async () => {
      await request(server)
        .ws('/path/nope')
        .expectConnectionError(404);
    });

    it('responds to asynchronously accepted connections', async () => {
      await request(server)
        .ws('/path/ws-async')
        .expectText('hello')
        .close()
        .expectClosed();
    });

    it('does not respond to asynchronously rejected connections', async () => {
      await request(server)
        .ws('/path/reject-ws-async')
        .expectConnectionError(404);
    });

    it('rejects connection asynchronously if handler rejects', async () => {
      await request(server)
        .ws('/path/explicit-reject-ws-async')
        .expectConnectionError(500);
    });
  });

  describe('multiple routes on same URL', () => {
    it('uses dedicated handlers for HTTP connections', async () => {
      const response = await request(server)
        .get('/path/multi')
        .expect(200);

      expect(response.text).toEqual('http');
    });

    it('uses dedicated handlers for websocket connections', async () => {
      await request(server)
        .ws('/path/multi')
        .expectText('ws')
        .close()
        .expectClosed();
    });

    it('uses shared handlers for HTTP connections', async () => {
      const response = await request(server)
        .get('/path/all-in-one')
        .expect(200);

      expect(response.text).toEqual('http');
    });

    it('uses shared handlers for websocket connections', async () => {
      await request(server)
        .ws('/path/all-in-one')
        .expectText('ws')
        .close()
        .expectClosed();
    });
  });
});
