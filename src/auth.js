import WebSocketWrapper from './WebSocketWrapper';

function splitFirst(data, delimiter) {
  const sep = data.indexOf(delimiter);
  if (sep === -1) {
    return [data];
  }
  return [data.substr(0, sep), data.substr(sep + delimiter.length)];
}

async function getProvidedToken(req, res) {
  const auth = req.get('Authorization');
  if (auth) {
    const [type, data] = splitFirst(auth, ' ');

    if (type === 'Bearer') {
      return data;
    }

    return null;
  }

  if (WebSocketWrapper.isInstance(res)) {
    const ws = await res.accept();
    return ws.nextMessage({ timeout: 5000 });
  }

  return null;
}

function scopesMap(scopes) {
  if (!scopes) {
    return null;
  }
  if (Array.isArray(scopes)) {
    const result = {};
    scopes.forEach((scope) => {
      result[scope] = true;
    });
    return result;
  }
  if (typeof scopes === 'object') {
    return scopes;
  }
  if (typeof scopes === 'string') {
    return { [scopes]: true };
  }
  return {};
}

export function requireBearerAuth(realm, scopesForToken) {
  let realmForRequest;
  if (typeof realm === 'string') {
    realmForRequest = () => realm;
  } else if (typeof realm === 'function') {
    realmForRequest = realm;
  } else {
    throw new Error('Invalid realm; must be a string or function');
  }

  return async (req, res, next) => {
    const authRealm = await realmForRequest(req, res);
    const token = await getProvidedToken(req, res);

    const authScopes = token ?
      scopesMap(await scopesForToken(token, authRealm, req, res)) :
      null;
    if (!authScopes) {
      res
        .status(401)
        .header('WWW-Authenticate', `Bearer realm="${authRealm}"`)
        .end();
      return;
    }

    res.locals.authRealm = authRealm;
    res.locals.authScopes = authScopes;

    next();
  };
}

export function hasAuthScope(res, scope) {
  if (!res || typeof res === 'string' || !res.locals) {
    throw new Error(
      'Must specify response object as first parameter to hasAuthScope',
    );
  }
  const { authScopes } = res.locals;
  return Boolean(authScopes && authScopes[scope]);
}

export function requireAuthScope(scope) {
  return async (req, res, next) => {
    const { authRealm } = res.locals;
    if (!hasAuthScope(res, scope)) {
      res
        .status(403)
        .header(
          'WWW-Authenticate',
          `Bearer realm="${authRealm}", scope="${scope}"`,
        )
        .end();
      return;
    }
    next();
  };
}
