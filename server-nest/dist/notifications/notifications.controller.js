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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let NotificationsController = class NotificationsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req) {
        const whereClause = { deleted: false };
        const user = req?.user;
        if (user) {
            const role = String(user.role).toUpperCase();
            if (role === 'ENTREPRISE') {
                try {
                    const entIdRaw = user.entrepriseId ?? user.entreprise?.id ?? null;
                    const entId = entIdRaw ? Number(entIdRaw) : null;
                    if (entId) {
                        whereClause.OR = [
                            { userId: Number(user.id) },
                            { alert: { entrepriseId: entId } },
                        ];
                    }
                    else {
                        whereClause.userId = Number(user.id);
                    }
                }
                catch {
                    whereClause.userId = Number(user.id);
                }
            }
            else {
                const nonRestrictedRoles = ['ADMIN_FISCAL', 'AGENT_FISCAL'];
                if (!nonRestrictedRoles.includes(role)) {
                    whereClause.userId = Number(user.id);
                }
            }
        }
        const rows = await this.prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { alert: { include: { mouvement: true, entreprise: true } } },
            take: 200,
        });
        const mapped = rows.map((n) => {
            const alert = n.alert ?? null;
            const mov = alert?.mouvement ?? null;
            let dueDate = null;
            if (mov) {
                const mvDate = mov.date_mouvement ?? mov.createdAt ?? null;
                dueDate = mvDate
                    ? mvDate instanceof Date
                        ? mvDate.toISOString()
                        : String(mvDate)
                    : null;
            }
            if (!dueDate && alert?.createdAt) {
                dueDate =
                    alert.createdAt instanceof Date
                        ? alert.createdAt.toISOString()
                        : String(alert.createdAt);
            }
            if (!dueDate) {
                dueDate =
                    n.createdAt instanceof Date
                        ? n.createdAt.toISOString()
                        : String(n.createdAt);
            }
            const movementDescription = mov?.description ?? null;
            const movementEntrepriseName = mov?.entreprise?.name ?? alert?.entreprise?.name ?? null;
            const movementEntrepriseNif = mov?.entreprise?.siret ?? alert?.entreprise?.siret ?? null;
            const payloadBase = typeof n.payload === 'object' && n.payload !== null
                ? n.payload
                : {};
            const payload = {
                ...payloadBase,
                alert,
                dueDate,
                movementDescription,
                movementEntrepriseName,
                movementEntrepriseNif,
            };
            return {
                id: n.id,
                userId: n.userId,
                alertId: n.alertId,
                payload,
                read: n.read,
                deleted: n.deleted ?? false,
                deletedAt: n.deletedAt ?? null,
                createdAt: n.createdAt,
            };
        });
        return mapped;
    }
    async markRead(id, req) {
        const user = req?.user;
        const authHeader = req?.headers?.authorization;
        console.debug('[NotificationsController] markRead auth header present', !!authHeader, authHeader ? `${authHeader.slice(0, 20)}...` : null);
        console.debug('[NotificationsController] markRead called', {
            id: Number(id),
            user: user ? { id: user.id, role: user.role } : null,
        });
        if (!user)
            throw new common_1.ForbiddenException();
        const notif = await this.prisma.notification.findUnique({
            where: { id: Number(id) },
            include: { alert: true },
        });
        console.debug('[NotificationsController] markRead fetched notif', {
            notif: notif
                ? {
                    id: notif.id,
                    userId: notif.userId,
                    alertId: notif.alertId,
                    alertEntrepriseId: notif.alert?.entrepriseId,
                }
                : null,
        });
        if (!notif)
            throw new common_1.ForbiddenException();
        const isOwner = notif.userId === Number(user.id);
        let allowed = isOwner;
        try {
            const roleStr = String(user.role).toUpperCase();
            if (!allowed &&
                (roleStr === 'ADMIN_FISCAL' || roleStr === 'AGENT_FISCAL')) {
                allowed = true;
            }
            if (!allowed && roleStr === 'ENTREPRISE') {
                const entIdRaw = user.entrepriseId ??
                    user.entreprise?.id ??
                    null;
                const entId = entIdRaw ? Number(entIdRaw) : null;
                if (entId && notif.alert?.entrepriseId === entId) {
                    allowed = true;
                }
            }
        }
        catch {
        }
        if (!allowed)
            throw new common_1.ForbiddenException();
        return this.prisma.notification.update({
            where: { id: Number(id) },
            data: { read: true },
        });
    }
    async remove(id, req) {
        const user = req?.user;
        const authHeader = req?.headers?.authorization;
        console.debug('[NotificationsController] remove auth header present', !!authHeader, authHeader ? `${authHeader.slice(0, 20)}...` : null);
        console.debug('[NotificationsController] remove called', {
            id: Number(id),
            user: user ? { id: user.id, role: user.role } : null,
        });
        if (!user)
            throw new common_1.ForbiddenException();
        const notif = await this.prisma.notification.findUnique({
            where: { id: Number(id) },
            include: { alert: true },
        });
        console.debug('[NotificationsController] remove fetched notif', {
            notif: notif
                ? {
                    id: notif.id,
                    userId: notif.userId,
                    alertId: notif.alertId,
                    alertEntrepriseId: notif.alert?.entrepriseId,
                }
                : null,
        });
        if (!notif)
            throw new common_1.ForbiddenException();
        const isOwner = notif.userId === Number(user.id);
        let allowed = isOwner;
        try {
            const roleStr = String(user.role).toUpperCase();
            if (!allowed &&
                (roleStr === 'ADMIN_FISCAL' || roleStr === 'AGENT_FISCAL')) {
                allowed = true;
            }
            if (!allowed && roleStr === 'ENTREPRISE') {
                const entIdRaw = user.entrepriseId ??
                    user.entreprise?.id ??
                    null;
                const entId = entIdRaw ? Number(entIdRaw) : null;
                if (entId && notif.alert?.entrepriseId === entId) {
                    allowed = true;
                }
            }
        }
        catch {
        }
        if (!allowed)
            throw new common_1.ForbiddenException();
        try {
            const updated = await this.prisma.notification.update({
                where: { id: Number(id) },
                data: { deleted: true, deletedAt: new Date() },
            });
            console.debug('[NotificationsController] remove soft-deleted', {
                id: updated.id,
            });
            return {
                success: true,
                id: updated.id,
            };
        }
        catch (err) {
            if (err && (err.code === 'P2025' || err.code === 'P2025')) {
                return { success: true, id: Number(id) };
            }
            console.error('[NotificationsController] remove error', err);
            throw err;
        }
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "remove", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('api/notifications'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map