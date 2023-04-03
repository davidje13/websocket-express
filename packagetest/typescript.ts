import {
  WebSocketExpress,
  isWebSocket,
  requireAuthScope,
  Router,
} from 'websocket-express';

// this file just checks types; the code is not executed

const JSON_BODY = WebSocketExpress.json({ limit: 4 * 1024 });

class MyRouter1 extends WebSocketExpress.Router {
  constructor() {
    super();

    this.ws(
      '/here',
      WebSocketExpress.requireAuthScope('read'),
      async (req, res) => {
        console.log(req.header('foo'));

        // @ts-expect-error
        console.log(req.header(8));

        isWebSocket(res);

        const ws = await res.accept();
        ws.send('hello');
        res.send('hi');

        // @ts-expect-error
        ws.send(Symbol());

        // @ts-expect-error
        res.send(Symbol());
      },
    );
    this.post(
      '/here',
      requireAuthScope('write'),
      JSON_BODY,
      async (req, res) => {
        isWebSocket(res);

        // @ts-expect-error
        await res.accept();

        res.send(Symbol());
      },
    );
  }
}

class MyRouter2 extends Router {
  constructor() {
    super();

    this.ws('/here', requireAuthScope('read'), async (req, res) => null);
    this.post('/here', requireAuthScope('write'), JSON_BODY, async () => null);
  }
}

const app = new WebSocketExpress();
app.use('/foo', new MyRouter1());
app.use('/bar', new MyRouter2());
const server = app.listen(0);
server.close();

// @ts-expect-error
app.use('/baz', new Date());

// @ts-expect-error
app.listen(0, 0);

// @ts-expect-error
isWebSocket(0);
