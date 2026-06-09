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

// 3. Explicit Upgrade Handling - ACCEPT ALL NO MATTER WHAT
server.on('upgrade', (request, socket, head) => {
  console.log(`[UPGRADE] Catching upgrade request: ${request.url}`);
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// 4. WebSocket Logic - ZERO VALIDATION FOR TESTING
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] SUCCESS! Connection established from ${req.url}`);
  
  // Assign dummy monitor DID for testing
  const did = 'did:hivagora:tester';
  router.registerClient(did, ws);

  ws.send(JSON.stringify({ type: 'broadcast', content: { msg: 'Server Connected Successfully' } }));

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      message.from = did;
      router.handleMessage(message);
    } catch (e) {}
  });

  ws.on('close', () => {
    router.removeClient(did);
    console.log(`[WS] Closed`);
  });
});

// 5. Start Server
const PORT = parseInt(process.env.PORT || '10000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hivagora Hub running on port ${PORT}`);
});
