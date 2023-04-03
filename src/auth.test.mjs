import request from 'superwstest';
import WebSocketExpress from './WebSocketExpress.mjs';
import {
  requireBearerAuth,
  getAuthData,
  hasAuthScope,
  requireAuthScope,
} from './auth.mjs';
import runServer from './runServer.mjs';

function makeTestServer() {
  const app = new WebSocketExpress();
  let server = null;

  app.use(
    '/simple',
    requireBearerAuth('some-realm', (token) => {
      if (token.startsWith('valid-')) {
        return JSON.parse(token.substr(6));
      }
      return null;
    }),
  );

  app.use('/simple/scoped', requireAuthScope('my-scope'));
  app.use('/simple/has-scope', (req, res) => {
    res.send(`s1: ${hasAuthScope(res, 's1')}`);
  });
  app.use('/simple/data', (req, res) => {
    res.send(`foo is ${getAuthData(res).foo}`);
  });
  app.use('/noauth/data', (req, res) => {
    res.send(`data is ${getAuthData(res)}`);
  });

  app.ws('/simple/hold', async (req, res) => {
    const ws = await res.accept();
    ws.on('close', () => {
      server.closeCallCount += 1;
    });
    ws.send('holding');
  });

  app.use('/simple', (req, res) => res.send('content'));

  server = app.createServer();
  server.closeCallCount = 0;
  return server;
}

describe('WebSocketExpress authentication middleware', () => {
  let server;

  beforeEach(() => {
    server = makeTestServer();
    return runServer(server);
  });

  describe('http', () => {
    it('rejects unauthenticated requests', async () => {
      await request(server).get('/simple').expect(401);
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

    it('rejects tokens which are expired', async () => {
      await request(server)
        .get('/simple')
        .set('Authorization', 'Bearer valid-{"exp": 1}')
        .expect(401);
    });

    it('rejects tokens which are not valid yet', async () => {
      const nbf = Math.ceil(Date.now() / 1000) + 10;
      await request(server)
        .get('/simple')
        .set('Authorization', `Bearer valid-{"nbf": ${nbf}}`)
        .expect(401);
    });

    it('ignores expiry times in the future', async () => {
      const exp = Math.ceil(Date.now() / 1000) + 10;
      await request(server)
        .get('/simple')
        .set('Authorization', `Bearer valid-{"exp": ${exp}}`)
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
        .set('Authorization', 'Bearer valid-{"scopes":{"my-scope":true}}')
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

      it('rejects tokens which are expired', async () => {
        await request(server)
          .ws('/simple/hold', {
            headers: { Authorization: 'Bearer valid-{"exp": 1}' },
          })
          .expectConnectionError(401);
      });

      it('rejects tokens which are not valid yet', async () => {
        const nbf = Math.ceil(Date.now() / 1000) + 10;
        await request(server)
          .ws('/simple/hold', {
            headers: { Authorization: `Bearer valid-{"nbf": ${nbf}}` },
          })
          .expectConnectionError(401);
      });

      it('closes the connection when the token expires', async () => {
        const exp = Math.ceil((Date.now() + 200) / 1000);
        await request(server)
          .ws('/simple/hold', {
            headers: { Authorization: `Bearer valid-{"exp": ${exp}}` },
          })
          .expectText('holding')
          .expectClosed(1001, 'Session expired');

        await expect.poll(() => server.closeCallCount, toEqual(1));
      });

      it('ignores token expiry if connection is already closed', async () => {
        const exp = Math.ceil((Date.now() + 200) / 1000);
        await request(server)
          .ws('/simple/hold', {
            headers: { Authorization: `Bearer valid-{"exp": ${exp}}` },
          })
          .expectText('holding')
          .close()
          .wait(1300);

        expect(server.closeCallCount).toEqual(1);
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
            headers: {
              Authorization: 'Bearer valid-{"scopes":{"my-scope":true}}',
            },
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

      it('rejects tokens which are expired', async () => {
        await request(server)
          .ws('/simple/hold')
          .send('valid-{"exp": 1}')
          .expectClosed(4401);
      });

      it('rejects tokens which are not valid yet', async () => {
        const nbf = Math.ceil(Date.now() / 1000) + 10;
        await request(server)
          .ws('/simple/hold')
          .send(`valid-{"nbf": ${nbf}}`)
          .expectClosed(4401);
      });

      it('closes the connection when the token expires', async () => {
        const exp = Math.ceil((Date.now() + 200) / 1000);
        await request(server)
          .ws('/simple/hold')
          .send(`valid-{"exp": ${exp}}`)
          .expectText('holding')
          .expectClosed(1001, 'Session expired');

        await expect.poll(() => server.closeCallCount, toEqual(1));
      });

      it('allows expiry far into the future', async () => {
        const exp = Math.ceil(Date.now() / 1000) + 60 * 60 * 24 * 365;
        await request(server)
          .ws('/simple/hold')
          .send(`valid-{"exp": ${exp}}`)
          .expectText('holding');
      });

      it('ignores token expiry if connection is already closed', async () => {
        const exp = Math.ceil((Date.now() + 200) / 1000);
        await request(server)
          .ws('/simple/hold')
          .send(`valid-{"exp": ${exp}}`)
          .expectText('holding')
          .close()
          .wait(1300);

        expect(server.closeCallCount).toEqual(1);
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
          .send('valid-{"scopes":{"my-scope":true}}')
          .expectText('content');
      });
    });
  });

  describe('getAuthData', () => {
    it('returns the parsed auth data', async () => {
      const response = await request(server)
        .get('/simple/data')
        .set('Authorization', 'Bearer valid-{"foo":"bar"}');

      expect(response.text).toEqual('foo is bar');
    });

    it('returns null if no auth data is available', async () => {
      const response = await request(server).get('/noauth/data');

      expect(response.text).toEqual('data is null');
    });
  });

  describe('hasAuthScope', () => {
    it('returns true if the user has the requested scope', async () => {
      const response = await request(server)
        .get('/simple/has-scope')
        .set('Authorization', 'Bearer valid-{"scopes":{"s1":true}}');

      expect(response.text).toEqual('s1: true');
    });

    it('returns false if the requested scope is not set', async () => {
      const response = await request(server)
        .get('/simple/has-scope')
        .set('Authorization', 'Bearer valid-{"scopes":{"s2":true}}');

      expect(response.text).toEqual('s1: false');
    });

    it('returns false if no scopes are set', async () => {
      const response = await request(server)
        .get('/simple/has-scope')
        .set('Authorization', 'Bearer valid-{}');

      expect(response.text).toEqual('s1: false');
    });
  });
});
