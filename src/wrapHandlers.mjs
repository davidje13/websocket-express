import http from 'node:http';
import WebSocketWrapper from './WebSocketWrapper.mjs';
import WebSocketExpress from './WebSocketExpress.mjs';

function wrapWebsocket(fn) {
  if (typeof fn !== 'function') {
    return fn;
  }
  return (req, res, next) => {
    if (WebSocketWrapper.isInstance(res)) {
      (async () => {
        try {
          await fn(req, res, next);
        } catch (e) {
          console.error('Uncaught error in websocket handler', e);
        }
      })();
    } else {
      next('route');
    }
  };
}

export function wrapNonWebsocket(fn) {
  if (typeof fn !== 'function') {
    return fn;
  }
  if (fn.length === 4) {
    // function is an error handler - must preserve signature for auto-detection inside express
    return (err, req, res, next) => {
      if (WebSocketWrapper.isInstance(res)) {
        next('route');
      } else {
        return fn(err, req, res, next);
      }
    };
  }
  return (req, res, next) => {
    if (WebSocketWrapper.isInstance(res)) {
      next('route');
    } else {
      return fn(req, res, next);
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

  let originalUse;
  if (src) {
    originalUse = src.use.bind(src);
    http.METHODS.forEach((method) => {
      const name = method.toLowerCase();
      target[name] = src[name].bind(src);
    });
    target.all = src.all.bind(src);
  } else {
    originalUse = target.use.bind(target);
  }

  target.ws = target.all;
  wrapHandler(target, 'ws', wrapWebsocket);

  target.use = (...args) =>
    originalUse(
      ...args.map((arg) => (arg instanceof WebSocketExpress ? arg.app : arg)),
    );

  target.useHTTP = originalUse;
  wrapHandler(target, 'useHTTP', wrapNonWebsocket);

  http.METHODS.forEach((method) => {
    wrapHandler(target, method.toLowerCase(), wrapNonWebsocket);
  });

  wrapHandler(target, 'all', wrapNonWebsocket);
}
