"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
let NotificationsGateway = class NotificationsGateway {
    jwt;
    server;
    userSockets = new Map();
    constructor(jwt) {
        this.jwt = jwt;
    }
    handleConnection(client) {
        const token = client.handshake.auth?.token;
        if (!token) {
            client.disconnect(true);
            return;
        }
        try {
            const raw = token.replace(/^Bearer\s+/i, '');
            const payload = this.jwt.verify(raw, {
                secret: process.env.JWT_SECRET || 'change-me-dev-secret',
            });
            const userId = payload?.sub;
            if (!userId) {
                client.disconnect(true);
                return;
            }
            const set = this.userSockets.get(userId) || new Set();
            set.add(client.id);
            this.userSockets.set(userId, set);
        }
        catch (e) {
            console.error('WebSocket auth error', e);
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        for (const [uid, set] of this.userSockets.entries()) {
            if (set.has(client.id)) {
                set.delete(client.id);
                if (set.size === 0)
                    this.userSockets.delete(uid);
                break;
            }
        }
    }
    sendToUser(userId, event, payload) {
        const set = this.userSockets.get(userId) || new Set();
        for (const id of set) {
            this.server.to(id).emit(event, payload);
        }
    }
    sendToAll(event, payload) {
        try {
            this.server?.emit(event, payload);
        }
        catch (e) {
            console.error('Error emitting to all sockets', e);
        }
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
exports.NotificationsGateway = NotificationsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/notifications', cors: { origin: '*' } }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map