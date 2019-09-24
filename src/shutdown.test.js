import { promisify } from 'util';
import request from 'superwstest';
import WebSocketExpress, { Router } from '.';

export default function makeTestServer(closeTimeout = 0) {
  const app = new WebSocketExpress();
  const router = new Router();

  router.ws('/path/nohold', async (req, res) => {
    const ws = await res.accept();
    ws.on('message', () => {
      ws.send('still here');
    });
  });

  router.ws('/path/hold', async (req, res) => {
    const ws = await res.accept();
    res.beginTransaction();
    ws.send('transaction begin');
    ws.on('message', () => {
      ws.send('transaction end');
      res.endTransaction();
    });
  });

  app.use(router);
  if (closeTimeout) {
    app.set('shutdown timeout', closeTimeout);
  }

  return app.createServer();
}

describe('WebSocketExpress shutdown', () => {
  let server;

  beforeEach((done) => {
    server = makeTestServer();
    server.listen(0, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  it('closes inactive websocket connections immediately', async () => {
    await request(server, { shutdownDelay: 6000 })
      .ws('/path/nohold')
      .send('1')
      .expectText('still here')
      .exec(() => promisify(server.close)())
      .expectClosed(1012, 'server shutdown');
  });

  it('waits for transactions to end before closing', async () => {
    let serverClose;

    await request(server, { shutdownDelay: 6000 })
      .ws('/path/hold')
      .expectText('transaction begin')
      .exec(() => {
        serverClose = promisify(server.close)();
      })
      .wait(200)
      .send('1')
      .expectText('transaction end')
      .expectClosed(1012, 'server shutdown');

    await serverClose; // server closes once all connections close
  });
});

describe('WebSocketExpress shutdown with timeout', () => {
  let server;

  beforeEach((done) => {
    server = makeTestServer(500);
    server.listen(0, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  it('force-closes transactions after timeout expires', async () => {
    let serverClose;

    await request(server, { shutdownDelay: 6000 })
      .ws('/path/hold')
      .expectText('transaction begin')
      .exec(() => {
        serverClose = promisify(server.close)();
      })
      .wait(600)
      .expectClosed(1012, 'server shutdown');

    await serverClose; // server closes once all connections close
  });
});
