import { Injectable } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private userSockets = new Map<number, Set<string>>();

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const raw = token.replace(/^Bearer\s+/i, '');
      const payload = this.jwt.verify(raw, {
        secret: process.env.JWT_SECRET || 'change-me-dev-secret',
      }) as Record<string, any> | null;
      const userId = payload?.sub as number | undefined;
      if (!userId) {
        client.disconnect(true);
        return;
      }
      const set = this.userSockets.get(userId) || new Set<string>();
      set.add(client.id);
      this.userSockets.set(userId, set);
    } catch (e) {
      // log and disconnect on any verification error
      console.error('WebSocket auth error', e);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [uid, set] of this.userSockets.entries()) {
      if (set.has(client.id)) {
        set.delete(client.id);
        if (set.size === 0) this.userSockets.delete(uid);
        break;
      }
    }
  }

  sendToUser(userId: number, event: string, payload: any) {
    const set = this.userSockets.get(userId) || new Set<string>();
    for (const id of set) {
      this.server.to(id).emit(event, payload);
    }
  }

  // Broadcast to all connected sockets (helper used by AlertsService)
  sendToAll(event: string, payload: any) {
    try {
      this.server?.emit(event, payload);
    } catch (e) {
      console.error('Error emitting to all sockets', e);
    }
  }
}
