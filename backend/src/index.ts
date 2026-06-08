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

// Root route for Health Check & Waking up the server
app.get('/', (req, res) => {
  res.send('Hivagora Hub is Running! Use /agents to see active agents.');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Manual upgrade handling

// Handle WebSocket Upgrade manually for better logging
server.on('upgrade', (request, socket, head) => {
  const reqUrl = request.url || '';
  console.log(`Incoming upgrade request for: ${reqUrl}`);
  
  if (reqUrl.startsWith('/hivagora/hub')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log(`Upgrade rejected for path: ${reqUrl}`);
    socket.destroy();
  }
});

// WebSocket: Message Hub
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // Use a dummy base for parsing relative URLs
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  console.log(`New WebSocket connection established. Token: ${token}`);

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
