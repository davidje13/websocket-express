import WebSocketExpress from '../WebSocketExpress';
import Router from '../Router';

function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

export default function makeTestServer() {
  const app = new WebSocketExpress();
  const router = new Router();

  router.get('/path/get', (req, res) => {
    res.end('get-output');
  });

  router.ws('/path/ws', (req, ws) => {
    ws.on('message', (msg) => {
      ws.send(`echo ${msg}`);
    });
    ws.send('hello');
  });

  router.ws('/path/reject-ws', (req, ws, next) => {
    next();
  });

  router.ws('/path/ws-async', async (req, ws) => {
    await sleep(100);
    ws.send('hello');
  });

  router.ws('/path/reject-ws-async', async (req, ws, next) => {
    await sleep(100);
    next();
  });

  app.use(router);

  return app.createServer();
}
