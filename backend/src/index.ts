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

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/hivagora/hub' });

// REST: Agent Login (Verify and Issue JWT)
app.post('/agent/login', async (req, res) => {
  const { address, signature, message } = req.body;
  
  if (!address || !signature || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const isValid = await verifySignature(message, signature, address);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const did = generateDid(address);
  const token = createToken(did, address);
  
  res.json({ did, token });
});

// WebSocket: Message Hub
wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'Token required');
    return;
  }

  let did: string;

  // Allow special token for Plaza monitoring
  if (token === 'plaza-monitor-token') {
    did = 'did:hivagora:monitor';
  } else {
    const decoded = verifyToken(token);
    if (!decoded) {
      ws.close(4002, 'Invalid token');
      return;
    }
    did = decoded.did;
  }

  router.registerClient(did, ws);

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      message.from = did; // Force 'from' to match authenticated DID
      router.handleMessage(message);
    } catch (e) {
      console.error('Failed to process message:', e);
    }
  });

  ws.on('close', () => {
    router.removeClient(did);
  });
});

const PORT = process.env.PORT || 4000;
app.get('/agents', (req, res) => { res.json(Array.from(router.clients.keys()).map(did => ({ did, status: 'online' }))); });
server.listen(PORT, () => {
  console.log(`Hivagora Hub Backend running on port ${PORT}`);
});
