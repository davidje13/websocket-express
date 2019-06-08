import request from 'superwstest';
import WebSocketExpress from '.';

function makeTestServer() {
  const app = new WebSocketExpress();
  app.use(WebSocketExpress.json());

  app.post('/meh', (req, res) => {
    res.json({ parsed: req.body });
  });

  app.ws('/path/ws', async (req, res) => {
    const ws = await res.accept();
    ws.on('message', (msg) => {
      ws.send(`echo ${msg}`);
    });
    ws.send('hello');
  });

  return app.createServer();
}

describe('WebSocketExpress json', () => {
  let server;

  beforeEach((done) => {
    server = makeTestServer();
    server.listen(0, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  it('applies to HTTP requests', async () => {
    const response = await request(server)
      .post('/meh')
      .send({ foo: 'bar' })
      .expect(200);

    expect(response.text).toEqual('{"parsed":{"foo":"bar"}}');
  });

  it('does not interfere with websocket connections', async () => {
    await request(server)
      .ws('/path/ws')
      .expectText('hello')
      .send('foo')
      .expectText('echo foo')
      .close()
      .expectClosed();
  });
});
