import request from 'superwstest';
import makeTestServer from './test-helpers/makeTestServer';

describe('WebSocketExpress', () => {
  let server;

  beforeEach((done) => {
    server = makeTestServer();
    server.listen(0, done);
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
        .expectClosed();
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
        .expectClosed();
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
        .expectClosed();
    });
  });
});
