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

// 1. Every HTTP request log
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Hivagora Hub is Live!');
});

const PORT = process.env.PORT || 10000;
const server = http.createServer(app);

// 2. The most standard way for Render: bind to the HTTP server directly
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] SUCCESS! Connected: ${req.url}`);
  
  const did = 'did:hivagora:tester';
  router.registerClient(did, ws);

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      if (message.type === 'monitor_auth') {
        console.log('[WS] Monitor Linked');
      }
      message.from = did;
      router.handleMessage(message);
    } catch (e) {}
  });

  ws.on('close', () => {
    router.removeClient(did);
    console.log('[WS] Disconnected');
  });

  ws.on('error', (err) => console.error('[WS] Error:', err));
});

// Start the unified server
server.listen(PORT, () => {
  console.log(`Unified Server running on port ${PORT}`);
});
