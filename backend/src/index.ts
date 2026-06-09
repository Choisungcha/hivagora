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

const PORT = parseInt(process.env.PORT || '10000', 10);
const server = http.createServer(app);

// 🛠 ULTIMATE FIX: Integrate WebSocket with the server differently
const wss = new WebSocketServer({ 
  noServer: true,
  perMessageDeflate: false 
});

// Explicitly handle upgrade with zero validation
server.on('upgrade', (request, socket, head) => {
  console.log(`[UPGRADE] Catching request for ${request.url}`);
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log('[WS] !!! SUCCESS !!! Connection Established');
  
  const did = 'did:hivagora:tester';
  router.registerClient(did, ws);

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

  // Keep alive
  ws.on('pong', () => {
    (ws as any).isAlive = true;
  });
});

// Keep-alive heartbeat
setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Unified Hub running on port ${PORT}`);
});
