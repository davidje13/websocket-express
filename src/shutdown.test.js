import http from 'http';
import { promisify } from 'util';
import request from 'superwstest';
import WebSocketExpress, { Router } from '.';

function makeTestApp() {
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

  return app;
}

describe('server.close', () => {
  let server;

  beforeEach((done) => {
    const app = makeTestApp();
    server = app.createServer();
    server.listen(0, 'localhost', done);
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

describe('app.detach', () => {
  let app;
  let server;

  beforeEach((done) => {
    app = makeTestApp();
    server = http.createServer();
    app.attach(server);
    server.listen(0, 'localhost', done);
  });

  afterEach((done) => {
    server.close(done);
  });

  it('closes inactive websocket connections immediately', async () => {
    await request(server, { shutdownDelay: 6000 })
      .ws('/path/nohold')
      .send('1')
      .expectText('still here')
      .exec(() => app.detach(server))
      .expectClosed(1012, 'server shutdown');
  });

  it('waits for transactions to end before closing', async () => {
    await request(server, { shutdownDelay: 6000 })
      .ws('/path/hold')
      .expectText('transaction begin')
      .exec(() => app.detach(server))
      .wait(200)
      .send('1')
      .expectText('transaction end')
      .expectClosed(1012, 'server shutdown');
  });

  describe('multiple servers', () => {
    let server2;

    beforeEach((done) => {
      server2 = app.createServer();
      server2.listen(0, 'localhost', done);
    });

    afterEach((done) => {
      server2.close(done);
    });

    it('does not close connections to other servers', async () => {
      await request(server2)
        .ws('/path/nohold')
        .exec(() => app.detach(server))
        .wait(200)
        .send('1')
        .expectText('still here');
    });
  });
});

describe('server.close with "shutdown timeout" set', () => {
  let server;

  beforeEach((done) => {
    const app = makeTestApp();
    app.set('shutdown timeout', 500);
    server = app.createServer();
    server.listen(0, 'localhost', done);
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
