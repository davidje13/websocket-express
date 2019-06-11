!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("websocket-express",[],t):"object"==typeof exports?exports["websocket-express"]=t():e["websocket-express"]=t()}(global,function(){return function(e){var t={};function s(n){if(t[n])return t[n].exports;var o=t[n]={i:n,l:!1,exports:{}};return e[n].call(o.exports,o,o.exports,s),o.l=!0,o.exports}return s.m=e,s.c=t,s.d=function(e,t,n){s.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},s.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.t=function(e,t){if(1&t&&(e=s(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(s.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)s.d(n,o,function(t){return e[t]}.bind(null,o));return n},s.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return s.d(t,"a",t),t},s.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},s.p="",s(s.s=3)}([function(e,t){e.exports=require("http")},function(e,t){e.exports=require("express")},function(e,t){e.exports=require("ws")},function(e,t,s){e.exports=s(4)},function(e,t,s){"use strict";s.r(t);var n=s(0),o=s.n(n),r=s(1),i=s.n(r),c=s(2),u=s.n(c);const a={};function l(e,t,s,o){if(e.writable){const r=s||n.STATUS_CODES[t],i={Connection:"close","Content-type":"text/html","Content-Length":Buffer.byteLength(r),...o};e.write([`HTTP/1.1 ${t} ${n.STATUS_CODES[t]}`,...Object.keys(i).map(e=>`${e}: ${i[e]}`),"",r].join("\r\n"))}e.destroy()}function h(e){e.nextMessage=function(e,{timeout:t=0}={}){return new Promise((s,n)=>{let o=null,r=null,i=null;const c=()=>{e.off("message",o),e.off("close",r),clearTimeout(i)};o=e=>{c(),s(e)},r=()=>{c(),n()},e.on("message",o),e.on("close",r),t>0&&(i=setTimeout(r,t))})}.bind(null,e)}class d{constructor(e,t,s,n){this.wsServer=e,this.req=t,this.socket=s,this.head=n,this.ws=null,this.closed=!1,this.nonce=a,this.closeTimeout=null,this.closeTime=0,this.closeTimeoutCode=null,this.closeTimeoutMessage=null,this.accept=this.accept,this.reject=this.reject,this.closeAtTime=this.closeAtTime,this.sendError=this.sendError,this.setHeader=()=>{},this.status=this.status,this.end=this.end,this.send=this.send,this.internalCheckCloseTimeout=this.internalCheckCloseTimeout}static isInstance(e){return e&&e.nonce===a}accept(){return this.closed?Promise.reject(new Error("Connection closed")):this.ws?Promise.resolve(this.ws):new Promise(e=>this.wsServer.handleUpgrade(this.req,this.socket,this.head,t=>{h(t),t.on("close",()=>clearTimeout(this.closeTimeout)),this.ws=t,e(this.ws)}))}reject(e=500,t=null){if(this.ws)throw new Error("Already accepted WebSocket connection");this.sendError(e,null,t)}sendError(e,t=null,s=null){if(this.closed)throw new Error("Connection closed");const o=s||n.STATUS_CODES[e];var r;this.closed=!0,this.ws?this.ws.close(t||((r=e)>=500?1011:4e3+r),o):l(this.socket,e,o)}internalCheckCloseTimeout(){if(clearTimeout(this.closeTimeout),this.closed)return;const e=Date.now();e<this.closeTime?this.closeTimeout=setTimeout(this.internalCheckCloseTimeout.bind(this),Math.min(this.closeTime-e,864e5)):(this.closed=!0,this.ws?this.ws.close(this.closeTimeoutCode,this.closeTimeoutMessage):l(this.socket,200,"Connection time limit reached"))}closeAtTime(e,t=1001,s=""){this.closed||null!==this.closeTimeout&&e>=this.closeTime||(this.closeTime=e,this.closeTimeoutCode=t,this.closeTimeoutMessage=s,this.internalCheckCloseTimeout())}status(e){if(e<400&&this.ws)throw new Error("Already accepted WebSocket connection");return this.sendError(e),this}end(){return this.ws||this.closed||this.sendError(404),this}send(e){return this.closed||(this.accept().then(t=>{t.send(e),t.close()}),this.closed=!0),this}}function f(e){return"function"!=typeof e?e:(t,s,n)=>{d.isInstance(s)?e(t,s,n):n("route")}}function p(e){return"function"!=typeof e?e:(t,s,n)=>{d.isInstance(s)?n("route"):e(t,s,n)}}function m(e,t,s){const n=e,o=n[t].bind(n);n[t]=(...e)=>o(...e.map(s))}function b(e,t=null){const s=e;t&&(s.use=t.use.bind(t),o.a.METHODS.forEach(e=>{const n=e.toLowerCase();s[n]=t[n].bind(t)}),s.all=t.all.bind(t)),s.ws=s.use,m(s,"ws",f),s.useHTTP=s.use,m(s,"useHTTP",p),o.a.METHODS.forEach(e=>{m(s,e.toLowerCase(),p)}),m(s,"all",p)}const w=["enable","enabled","disable","disabled","set","get","engine","path"];class T{constructor(...e){this.app=i()(...e),this.locals=this.app.locals,this.wsServer=new u.a.Server({noServer:!0}),this.app.use((e,t,s,n)=>{d.isInstance(s)&&s.sendError(500),n(e)}),this.handleUpgrade=this.handleUpgrade.bind(this),this.handleRequest=this.handleRequest.bind(this),w.forEach(e=>{this[e]=this.app[e].bind(this.app)}),b(this,this.app)}handleUpgrade(e,t,s){const n=new d(this.wsServer,e,t,s);return this.app(e,n)}handleRequest(e,t){return this.app(e,t)}attach(e){e.on("upgrade",this.handleUpgrade),e.on("request",this.handleRequest)}detach(e){e.removeListener("upgrade",this.handleUpgrade),e.removeListener("request",this.handleRequest)}createServer(){const e=o.a.createServer();return this.attach(e),e}listen(...e){return this.createServer().listen(...e)}}["static","json","urlencoded"].forEach(e=>{T[e]=(...t)=>p(i.a[e](...t))});class y extends i.a.Router{constructor(...e){super(...e),b(this)}}function S(e,t){let s;if("string"==typeof e)s=()=>e;else{if("function"!=typeof e)throw new Error("Invalid realm; must be a string or function");s=e}return async(e,n,o)=>{const r=Math.floor(Date.now()/1e3),i=await s(e,n),c=await async function(e,t){const s=e.get("Authorization");if(s){const[e,t]=function(e,t){const s=e.indexOf(t);return-1===s?[e]:[e.substr(0,s),e.substr(s+t.length)]}(s," ");return"Bearer"===e?t:null}if(d.isInstance(t))return(await t.accept()).nextMessage({timeout:5e3});return null}(e,n);let u=null;c&&(u=await t(c,i,e,n)),!u||"number"==typeof u.nbf&&r<u.nbf||"number"==typeof u.exp&&r>=u.exp?n.status(401).header("WWW-Authenticate",`Bearer realm="${i}"`).end():("number"==typeof u.exp&&d.isInstance(n)&&n.closeAtTime(1e3*u.exp,1001,"Session expired"),n.locals.authRealm=i,n.locals.authData=u,n.locals.authScopes=function(e){if(!e||"object"!=typeof e||!e.scopes)return{};const{scopes:t}=e;if(Array.isArray(t)){const e={};return t.forEach(t=>{e[t]=!0}),e}return"object"==typeof t?t:"string"==typeof t?{[t]:!0}:{}}(u),o())}}function g(e){if(!e||"object"!=typeof e||!e.locals)throw new Error("Must provide response object to getAuthData");return e.locals.authData||null}function x(e,t){if(!e||"object"!=typeof e||!e.locals)throw new Error("Must provide response object to hasAuthScope");const{authScopes:s}=e.locals;return Boolean(s&&s[t])}function v(e){return async(t,s,n)=>{const{authRealm:o}=s.locals;x(s,e)?n():s.status(403).header("WWW-Authenticate",`Bearer realm="${o}", scope="${e}"`).end()}}s.d(t,"isWebSocket",function(){return A}),s.d(t,"Router",function(){return y}),s.d(t,"requireBearerAuth",function(){return S}),s.d(t,"requireAuthScope",function(){return v}),s.d(t,"getAuthData",function(){return g}),s.d(t,"hasAuthScope",function(){return x});const A=d.isInstance;T.Router=y,T.isWebSocket=A,T.requireBearerAuth=S,T.requireAuthScope=v,T.getAuthData=g,T.hasAuthScope=x;t.default=T}])});
//# sourceMappingURL=index.js.map