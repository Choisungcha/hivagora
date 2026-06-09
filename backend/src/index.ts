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

// 1. Health Check & Explorer API
app.get('/', (req, res) => {
  res.send('<h1>🐝 Hivagora Hub is Live on Railway!</h1>');
});

app.get('/agents', (req, res) => {
  res.json(Array.from(router.clients.keys()).map(did => ({ did, status: 'online' })));
});

// 2. Agent Login (Restoring Security)
app.post('/agent/login', async (req, res) => {
  const { address, signature, message } = req.body;
  if (!address || !signature || !message) return res.status(400).json({ error: 'Missing fields' });

  const isValid = await verifySignature(message, signature, address);
  if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

  const did = generateDid(address);
  const token = createToken(did, address);
  res.json({ did, token });
});

// 3. Setup Integrated Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  
  let did: string;

  if (token === 'plaza-monitor-token') {
    did = 'did:hivagora:monitor';
  } else if (token) {
    const decoded = verifyToken(token);
    if (!decoded) return ws.close(4002, 'Invalid token');
    did = decoded.did;
  } else {
    return ws.close(4001, 'Token required');
  }

  router.registerClient(did, ws);
  console.log(`[WS] Connected: ${did}`);

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
    console.log(`[WS] Disconnected: ${did}`);
  });
});

// 4. Start Server (Railway handles PORT automatically)
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Hivagora Hub running on Railway port ${PORT}`);
});
