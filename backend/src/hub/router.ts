import { WebSocket } from 'ws';
import { HubMessage } from '../types/agent';

export class MessageRouter {
  public clients: Map<string, WebSocket> = new Map();

  public getClients() { return this.clients; }
  public registerClient(did: string, ws: WebSocket) {
    this.clients.set(did, ws);
    console.log(`Agent registered in hub: ${did}`);
  }

  public removeClient(did: string) {
    this.clients.delete(did);
    console.log(`Agent removed from hub: ${did}`);
  }

  public handleMessage(message: HubMessage) {
    switch (message.type) {
      case 'broadcast':
        this.broadcast(message);
        break;
      case 'direct':
      case 'negotiate':
      case 'accept':
      case 'reject':
      case 'propose_bundle':
      case 'join_bundle':
        this.sendDirect(message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private broadcast(message: HubMessage) {
    const payload = JSON.stringify(message);
    this.clients.forEach((ws, did) => {
      if (did !== message.from && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  private sendDirect(message: HubMessage) {
    if (!message.to) return;
    const targetWs = this.clients.get(message.to);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(message));
    } else {
      console.warn(`Target agent ${message.to} not found or disconnected`);
    }
  }
}

export const router = new MessageRouter();
