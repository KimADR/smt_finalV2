import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwt;
    server: Server;
    private userSockets;
    constructor(jwt: JwtService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    sendToUser(userId: number, event: string, payload: any): void;
    sendToAll(event: string, payload: any): void;
}
