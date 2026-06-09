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

// Health Check
app.get('/', (req, res) => {
  res.send('<h1>🐝 Hivagora Hub is Live!</h1>');
});

app.get('/agents', (req, res) => {
  res.json(Array.from(router.clients.keys()).map(did => ({ did, status: 'online' })));
});

const server = http.createServer(app);

// 1. Ultra-Compatible WebSocket Server
// Listening to all paths and disabling perMessageDeflate for proxy stability
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: false
});

// 2. Simplest Connection Logic
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] Connection opened from ${req.url}`);
  
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  
  let did: string = 'did:hivagora:unknown';

  if (token === 'plaza-monitor-token') {
    did = 'did:hivagora:monitor';
    console.log('[WS] Monitor linked');
  } else if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      did = decoded.did;
      console.log(`[WS] Agent linked: ${did}`);
    } else {
      console.log(`[WS] Token invalid: ${token}`);
      ws.send(JSON.stringify({ type: 'error', content: 'Invalid Token' }));
      // Don't close immediately to avoid "failed" error in browser
    }
  } else {
    console.log('[WS] No token provided');
  }

  router.registerClient(did, ws);

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      message.from = did;
      router.handleMessage(message);
    } catch (e) {
      console.error('[WS] Message error');
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Closed: ${did}`);
    router.removeClient(did);
  });

  ws.on('error', (err) => console.error('[WS] Error:', err));
});

// 3. Robust Port Binding for Render
const PORT = parseInt(process.env.PORT || '4000', 10);
server.listen(PORT, () => {
  console.log(`Hivagora Hub running on port ${PORT}`);
});
