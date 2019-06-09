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

function extractScopesMap(data) {
  if (!data || typeof data !== 'object' || !data.scopes) {
    return {};
  }
  const { scopes } = data;
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

export function requireBearerAuth(realm, extractAndValidateToken) {
  let realmForRequest;
  if (typeof realm === 'string') {
    realmForRequest = () => realm;
  } else if (typeof realm === 'function') {
    realmForRequest = realm;
  } else {
    throw new Error('Invalid realm; must be a string or function');
  }

  return async (req, res, next) => {
    const now = Math.floor(Date.now() / 1000);
    const authRealm = await realmForRequest(req, res);
    const token = await getProvidedToken(req, res);

    let tokenData = null;
    if (token) {
      tokenData = await extractAndValidateToken(token, authRealm, req, res);
    }

    if (
      !tokenData ||
      (typeof tokenData.nbf === 'number' && now < tokenData.nbf) ||
      (typeof tokenData.exp === 'number' && now >= tokenData.exp)
    ) {
      res
        .status(401)
        .header('WWW-Authenticate', `Bearer realm="${authRealm}"`)
        .end();
      return;
    }

    if (typeof tokenData.exp === 'number' && WebSocketWrapper.isInstance(res)) {
      res.closeAtTime(tokenData.exp * 1000, 1001, 'Session expired');
    }

    res.locals.authRealm = authRealm;
    res.locals.authData = tokenData;
    res.locals.authScopes = extractScopesMap(tokenData);

    next();
  };
}

export function getAuthData(res) {
  if (!res || typeof res !== 'object' || !res.locals) {
    throw new Error('Must provide response object to getAuthData');
  }
  return res.locals.authData || null;
}

export function hasAuthScope(res, scope) {
  if (!res || typeof res !== 'object' || !res.locals) {
    throw new Error('Must provide response object to hasAuthScope');
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
