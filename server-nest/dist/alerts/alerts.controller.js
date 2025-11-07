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
exports.AlertsController = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const alerts_service_1 = require("./alerts.service");
let AlertsController = class AlertsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async list(req, period, entrepriseId) {
        return this.service.getAlertsForUser(req?.user ?? null, period, entrepriseId ? Number(entrepriseId) : undefined);
    }
    async resolve(id) {
        return this.service.resolveAlert(Number(id));
    }
    async delete(id) {
        return this.service.deleteAlert(Number(id));
    }
    async getOne(id, req) {
        const alert = await this.service['prisma'].alert.findUnique({
            where: { id: Number(id) },
            include: { entreprise: true, mouvement: true },
        });
        if (!alert)
            return null;
        const user = req?.user;
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const entId = user.entrepriseId ?? user.entreprise?.id;
            if (Number(entId) !== Number(alert.entrepriseId))
                return null;
        }
        return alert;
    }
    async backfillNotifications(req) {
        const user = req?.user;
        if (!user)
            return { ok: false, reason: 'unauthenticated' };
        if (!['ADMIN_FISCAL', 'AGENT_FISCAL'].includes(String(user.role)))
            return { ok: false, reason: 'forbidden' };
        const alerts = await this.service['prisma'].alert.findMany({
            where: {},
            include: { notifications: true },
        });
        let created = 0;
        for (const a of alerts) {
            if (a.notifications && a.notifications.length > 0)
                continue;
            const admins = await this.service['prisma'].user.findMany({
                where: { role: { in: ['ADMIN_FISCAL', 'AGENT_FISCAL'] } },
            });
            const entrepriseUsers = await this.service['prisma'].user.findMany({
                where: { entrepriseId: a.entrepriseId },
            });
            const map = new Map();
            admins.forEach((x) => map.set(x.id, x));
            entrepriseUsers.forEach((x) => map.set(x.id, x));
            const recipients = Array.from(map.values());
            for (const u of recipients) {
                await this.service['prisma'].notification.create({
                    data: {
                        userId: u.id,
                        alertId: a.id,
                        payload: { alertId: a.id, type: a.type, level: a.level },
                    },
                });
                created++;
            }
            await this.service['prisma'].alert.update({
                where: { id: a.id },
                data: { notifiedAt: new Date() },
            });
        }
        return { ok: true, created };
    }
    async backfillMouvements(req) {
        const user = req?.user;
        if (!user)
            return { ok: false, reason: 'unauthenticated' };
        if (!['ADMIN_FISCAL', 'AGENT_FISCAL'].includes(String(user.role)))
            return { ok: false, reason: 'forbidden' };
        const mouvements = await this.service['prisma'].mouvement.findMany({
            take: 1000,
        });
        const mouvementIds = mouvements.map((m) => m.id);
        if (mouvementIds.length === 0)
            return { ok: true, created: 0 };
        const existingAlerts = await this.service['prisma'].alert.findMany({
            where: { mouvementId: { in: mouvementIds } },
            select: { mouvementId: true },
        });
        const hasAlert = new Set(existingAlerts.map((a) => a.mouvementId));
        let created = 0;
        for (const m of mouvements) {
            if (hasAlert.has(m.id))
                continue;
            try {
                await this.service.createForMouvement(m);
                created++;
            }
            catch (e) {
                console.error('[alerts.backfillMouvements] failed for mouvement', m.id, e);
            }
        }
        return { ok: true, created };
    }
};
exports.AlertsController = AlertsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('entrepriseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Patch)(':id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "resolve", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "getOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_2.Post)('backfill-notifications'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "backfillNotifications", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_2.Post)('backfill-mouvements'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AlertsController.prototype, "backfillMouvements", null);
exports.AlertsController = AlertsController = __decorate([
    (0, common_1.Controller)('api/alerts'),
    __metadata("design:paramtypes", [alerts_service_1.AlertsService])
], AlertsController);
//# sourceMappingURL=alerts.controller.js.map