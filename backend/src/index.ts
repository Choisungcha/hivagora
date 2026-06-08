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

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/hivagora/hub' });

// WebSocket: Message Hub
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`New connection request from: ${req.socket.remoteAddress}`);
  
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  
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
