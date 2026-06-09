import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './hub/router';
import { HubMessage } from './types/agent';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hivagora Hub is Live!');
});

const server = http.createServer(app);

// Use the most standard setup recommended for WebSocket on Render
const wss = new WebSocketServer({ 
  server,
  // No path specified to avoid any routing issues at the balancer level
});

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] CONNECTION SUCCESS from ${req.url}`);
  
  const did = 'did:hivagora:tester';
  router.registerClient(did, ws);

  ws.send(JSON.stringify({ type: 'broadcast', content: { msg: 'Connected to Hub' } }));

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      message.from = did;
      router.handleMessage(message);
    } catch (e) {}
  });

  ws.on('close', () => {
    router.removeClient(did);
    console.log('[WS] Disconnected');
  });
});

// Render dynamic port or 10000
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
