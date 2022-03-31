import WebSocketExpress, { isWebSocket, Router } from 'websocket-express';

// this file just checks types; the code is not executed

const app = new WebSocketExpress();
const server = app.listen(0);
server.close();

// @ts-expect-error
app.listen(0, 0);

// @ts-expect-error
isWebSocket(0);
