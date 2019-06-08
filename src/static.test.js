import path from 'path';
import request from 'superwstest';
import WebSocketExpress from './index';

function makeTestServer() {
  const app = new WebSocketExpress();
  app.use(WebSocketExpress.static(path.join(__dirname, 'test-static')));
  return app.createServer();
}

describe('WebSocketExpress static', () => {
  let server;

  beforeEach((done) => {
    server = makeTestServer();
    server.listen(0, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  it('propagates to static handler', async () => {
    const response = await request(server)
      .get('/foo.txt')
      .expect(200);

    expect(response.text).toEqual('static-output\n');
  });

  it('does not respond to websocket connections', async () => {
    await request(server)
      .ws('/foo.txt')
      .expectConnectionError(404);
  });
});
