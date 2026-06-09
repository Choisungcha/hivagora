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

// Log every request to see if WS upgrade reaches here
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} - ${req.headers['user-agent']}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Hivagora Hub is Live!');
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] Connection Established: ${req.url}`);
  
  // Heartbeat to keep connection alive on Render
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000);

  const did = 'did:hivagora:tester';
  router.registerClient(did, ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'monitor_auth') {
        console.log('[WS] Monitor Authenticated');
      }
      message.from = did;
      router.handleMessage(message);
    } catch (e) {}
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    router.removeClient(did);
    console.log('[WS] Disconnected');
  });
});

// Render dynamic port or 10000
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
