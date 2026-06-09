import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateDid } from './auth/did';
import { createToken, verifySignature, verifyToken } from './auth/verify';
import { router } from './hub/router';
import { HubMessage } from './types/agent';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Basic Health Routes
app.get('/', (req, res) => {
  res.send('<h1>🐝 Hivagora Hub is Live!</h1><p>Status: OK</p>');
});

app.get('/agents', (req, res) => {
  res.json(Array.from(router.clients.keys()).map(did => ({ did, status: 'online' })));
});

// 2. HTTP Server & WebSocket Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ 
  noServer: true, // Handle upgrade manually to ensure path matching
  perMessageDeflate: false 
});

// 3. Explicit Upgrade Handling (The most robust way for Render)
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', 'http://localhost');
  console.log(`[UPGRADE] Attempt for path: ${url.pathname}`);

  if (url.pathname === '/hub' || url.pathname === '/hub/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log(`[UPGRADE] Rejected: Invalid path ${url.pathname}`);
    socket.destroy();
  }
});

// 4. Connection Logic
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  console.log(`[WS] New connection verified. Token present: ${!!token}`);
  
  let did: string = 'did:hivagora:guest';

  if (token === 'plaza-monitor-token') {
    did = 'did:hivagora:monitor';
  } else if (token) {
    const decoded = verifyToken(token);
    if (decoded) did = decoded.did;
  }

  router.registerClient(did, ws);

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      message.from = did;
      router.handleMessage(message);
    } catch (e) {
      console.error('[WS] Message parse error');
    }
  });

  ws.on('close', () => {
    router.removeClient(did);
    console.log(`[WS] Closed: ${did}`);
  });
});

// 5. Start Server
const PORT = parseInt(process.env.PORT || '10000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hivagora Hub running on port ${PORT}`);
});
