import path from 'node:path';
import url from 'node:url';
import request from 'superwstest';
import { WebSocketExpress } from './index.mjs';
import runServer from './runServer.mjs';

const rootDir = path.dirname(url.fileURLToPath(import.meta.url));

function makeTestServer() {
  const app = new WebSocketExpress();
  app.use(WebSocketExpress.static(path.join(rootDir, 'test-static')));
  return app.createServer();
}

describe('WebSocketExpress static', () => {
  let server;

  beforeEach(() => {
    server = makeTestServer();
    return runServer(server);
  });

  it('propagates to static handler', async () => {
    const response = await request(server).get('/foo.txt').expect(200);

    expect(response.text).toEqual('static-output\n');
  });

  it('does not respond to websocket connections', async () => {
    await request(server).ws('/foo.txt').expectConnectionError(404);
  });

  it('includes mime types', async () => {
    const htmlType = WebSocketExpress.static.mime.lookup('a.html');

    expect(htmlType).toEqual('text/html');
  });
});
