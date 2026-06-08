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
  res.send('Hivagora Hub is Running! Ready for AI Agents.');
});

app.get('/agents', (req, res) => {
  res.json(Array.from(router.clients.keys()).map(did => ({ did, status: 'online' })));
});

// Explicit GET route for the hub path to confirm reachability via browser
app.get('/hivagora/hub', (req, res) => {
  res.send('Hivagora WebSocket Hub is waiting for connection upgrades...');
});

const server = http.createServer(app);
const wss = new WebSocketServer({ 
  noServer: true,
  perMessageDeflate: false 
});

// Flexible upgrade handling to catch variations like /hivagora/hub/ or with query params
server.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  console.log(`[UPGRADE] Raw URL: ${url}`);

  if (url.includes('/hivagora/hub')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log(`[UPGRADE] Rejected: ${url}`);
    socket.destroy();
  }
});

// WebSocket: Message Hub
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  
  console.log(`[CONN] New client with token: ${token}`);
  
  if (!token) {
    console.log('Connection rejected: No token provided');
    ws.close(4001, 'Token required');
    return;
  }

  let did: string;
  if (token === 'plaza-monitor-token') {
    did = 'did:hivagora:monitor';
    console.log('Plaza monitor connected');
  } else {
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log(`Connection rejected: Invalid token - ${token}`);
      ws.close(4002, 'Invalid token');
      return;
    }
    did = decoded.did;
    console.log(`Agent connected: ${did}`);
  }

  router.registerClient(did, ws);

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      message.from = did;
      router.handleMessage(message);
    } catch (e) {
      console.error('Failed to process message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`Connection closed: ${did}`);
    router.removeClient(did);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${did}:`, err);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hivagora Hub Backend running on port ${PORT}`);
});
