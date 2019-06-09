import request from 'superwstest';
import WebSocketExpress from './WebSocketExpress';
import { requireBearerAuth, hasAuthScope, requireAuthScope } from './auth';

function makeTestServer() {
  const app = new WebSocketExpress();

  app.use('/simple', requireBearerAuth(
    'foo',
    (token) => {
      if (token.startsWith('valid-')) {
        return JSON.parse(token.substr(6));
      }
      return null;
    },
  ));

  app.use('/simple/scoped', requireAuthScope('my-scope'));
  app.use('/simple/has-scope', (req, res) => {
    res.send(`s1: ${hasAuthScope(res, 's1')}`);
  });

  app.use('/simple', (req, res) => res.send('content'));

  return app.createServer();
}

describe('WebSocketExpress authentication middleware', () => {
  let server;

  beforeEach((done) => {
    server = makeTestServer();
    server.listen(0, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  describe('http', () => {
    it('rejects unauthenticated requests', async () => {
      await request(server)
        .get('/simple')
        .expect(401);
    });

    it('rejects unknown authentication schemes', async () => {
      await request(server)
        .get('/simple')
        .set('Authorization', 'Foo valid-{}')
        .expect(401);
    });

    it('rejects invalid authentication', async () => {
      await request(server)
        .get('/simple')
        .set('Authorization', 'Bearer invalid-{}')
        .expect(401);
    });

    it('accepts valid authentication', async () => {
      await request(server)
        .get('/simple')
        .set('Authorization', 'Bearer valid-{}')
        .expect(200);
    });

    it('rejects users without required scope', async () => {
      await request(server)
        .get('/simple/scoped')
        .set('Authorization', 'Bearer valid-{}')
        .expect(403);
    });

    it('accepts users with required scope', async () => {
      await request(server)
        .get('/simple/scoped')
        .set('Authorization', 'Bearer valid-{"my-scope":true}')
        .expect(200);
    });
  });

  describe('ws', () => {
    describe('header based authentication', () => {
      it('rejects unknown authentication schemes', async () => {
        await request(server)
          .ws('/simple', {
            headers: { Authorization: 'Foo valid-{}' },
          })
          .expectConnectionError(401);
      });

      it('rejects invalid authentication', async () => {
        await request(server)
          .ws('/simple', {
            headers: { Authorization: 'Bearer invalid-{}' },
          })
          .expectConnectionError(401);
      });

      it('accepts valid authentication', async () => {
        await request(server)
          .ws('/simple', {
            headers: { Authorization: 'Bearer valid-{}' },
          })
          .expectText('content');
      });

      it('rejects users without required scope', async () => {
        await request(server)
          .ws('/simple/scoped', {
            headers: { Authorization: 'Bearer valid-{}' },
          })
          .expectConnectionError(403);
      });

      it('accepts users with required scope', async () => {
        await request(server)
          .ws('/simple/scoped', {
            headers: { Authorization: 'Bearer valid-{"my-scope":true}' },
          })
          .expectText('content');
      });
    });

    describe('first message based authentication', () => {
      // browsers do not support custom headers, so this is an alternative

      it('rejects invalid authentication', async () => {
        await request(server)
          .ws('/simple')
          .send('invalid-{}')
          .expectClosed(4401);
      });

      it('accepts valid authentication', async () => {
        await request(server)
          .ws('/simple')
          .send('valid-{}')
          .expectText('content');
      });

      it('rejects users without required scope', async () => {
        await request(server)
          .ws('/simple/scoped')
          .send('valid-{}')
          .expectClosed(4403);
      });

      it('accepts users with required scope', async () => {
        await request(server)
          .ws('/simple/scoped')
          .send('valid-{"my-scope":true}')
          .expectText('content');
      });
    });
  });

  describe('hasAuthScope', () => {
    it('returns true if the user has the requested scope', async () => {
      const response = await request(server)
        .get('/simple/has-scope')
        .set('Authorization', 'Bearer valid-{"s1":true}');

      expect(response.text).toEqual('s1: true');
    });

    it('returns false if the requested scope is not set', async () => {
      const response = await request(server)
        .get('/simple/has-scope')
        .set('Authorization', 'Bearer valid-{"s2":true}');

      expect(response.text).toEqual('s1: false');
    });
  });
});
