import http from 'http';
import WebSocketWrapper from './WebSocketWrapper';

function wrapWebsocket(fn) {
  if (typeof fn !== 'function') {
    return fn;
  }
  return (req, res, next) => {
    if (WebSocketWrapper.isInstance(res)) {
      fn(req, res, next);
    } else {
      next('route');
    }
  };
}

export function wrapNonWebsocket(fn) {
  if (typeof fn !== 'function') {
    return fn;
  }
  return (req, res, next) => {
    if (WebSocketWrapper.isInstance(res)) {
      next('route');
    } else {
      fn(req, res, next);
    }
  };
}

function wrapHandler(o, method, wrapper) {
  const target = o;
  const original = target[method].bind(target);
  target[method] = (...handlers) => original(...handlers.map(wrapper));
}

export default function wrapHandlers(o, src = null) {
  const target = o;

  if (src) {
    target.use = src.use.bind(src);
    http.METHODS.forEach((method) => {
      const name = method.toLowerCase();
      target[name] = src[name].bind(src);
    });
    target.all = src.all.bind(src);
  }

  target.ws = target.use;
  wrapHandler(target, 'ws', wrapWebsocket);

  target.useHTTP = target.use;
  wrapHandler(target, 'useHTTP', wrapNonWebsocket);

  http.METHODS.forEach((method) => {
    wrapHandler(target, method.toLowerCase(), wrapNonWebsocket);
  });

  wrapHandler(target, 'all', wrapNonWebsocket);
}
