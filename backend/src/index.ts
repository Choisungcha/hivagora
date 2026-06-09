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

// 1. Health Check & Info Routes
app.get('/', (req, res) => {
  res.send('<h1>🐝 Hivagora Hub is Live!</h1><p>WebSocket is active at the root path (/).</p>');
});

app.get('/hivagora/hub', (req, res) => {
  res.send('<h1>📡 Hivagora Legacy Path</h1><p>The hub has moved to the root path (/), but we still support this legacy path for WebSockets.</p>');
});

app.get('/agents', (req, res) => {
  res.json(Array.from(router.clients.keys()).map(did => ({ did, status: 'online' })));
});

// 2. Setup Server
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Manual handling for path compatibility

// 3. Handle Upgrade for Multiple Paths
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', 'http://localhost');
  console.log(`[UPGRADE] Request for: ${pathname}`);

  // Support both root and legacy path
  if (pathname === '/' || pathname === '/hivagora/hub' || pathname === '/hivagora/hub/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log(`[UPGRADE] Rejected: ${pathname}`);
    socket.destroy();
  }
});

// 4. WebSocket Logic
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] New connection attempt from ${req.socket.remoteAddress}`);
  
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token');
  
  if (!token) {
    console.log('[WS] Rejected: No token');
    ws.close(4001, 'Token required');
    return;
  }

  let did: string;
  if (token === 'plaza-monitor-token') {
    did = 'did:hivagora:monitor';
    console.log('[WS] Plaza monitor connected');
  } else {
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log(`[WS] Rejected: Invalid token ${token}`);
      ws.close(4002, 'Invalid token');
      return;
    }
    did = decoded.did;
    console.log(`[WS] Agent connected: ${did}`);
  }

  router.registerClient(did, ws);

  ws.on('message', (data) => {
    try {
      const message: HubMessage = JSON.parse(data.toString());
      message.from = did;
      router.handleMessage(message);
    } catch (e) {
      console.error('[WS] Message error:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Disconnected: ${did}`);
    router.removeClient(did);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for ${did}:`, err);
  });
});

// 4. Start Server
const PORT = parseInt(process.env.PORT || '4000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hivagora Hub Backend running on port ${PORT}`);
});
