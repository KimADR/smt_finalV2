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
exports.AlertsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
let AlertsService = class AlertsService {
    prisma;
    gateway;
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
    }
    async createForMouvement(m) {
        const alert = await this.prisma.alert.create({
            data: {
                type: 'MOUVEMENT',
                level: 'simple',
                status: 'open',
                entrepriseId: m.entrepriseId,
                mouvementId: m.id,
            },
        });
        await this.notifyOnAlert(alert);
        return alert;
    }
    async notifyOnAlert(alert) {
        const full = await this.prisma.alert.findUnique({
            where: { id: alert.id },
            include: {
                mouvement: { include: { entreprise: true } },
                entreprise: true,
            },
        });
        const mov = full?.mouvement;
        const alertCreated = full?.createdAt instanceof Date
            ? full.createdAt
            : new Date(String(full?.createdAt ?? Date.now()));
        const parseDate = (v) => {
            if (!v)
                return null;
            if (v instanceof Date)
                return v;
            if (typeof v === 'string' || typeof v === 'number') {
                const d = new Date(String(v));
                return isNaN(d.getTime()) ? null : d;
            }
            return null;
        };
        let dueDateObj;
        if (mov) {
            const mvRaw = mov['date_mouvement'] ??
                mov['createdAt'] ??
                null;
            const mvDate = parseDate(mvRaw);
            dueDateObj = mvDate ?? alertCreated;
        }
        else {
            dueDateObj = alertCreated;
        }
        const dueDate = dueDateObj.toISOString();
        const movementDescription = mov?.description ?? null;
        const movementEntrepriseName = mov?.entreprise ? mov.entreprise.name : null;
        const movementEntrepriseNif = mov?.entreprise?.siret ?? null;
        const admins = await this.prisma.user.findMany({
            where: { role: { in: ['ADMIN_FISCAL', 'AGENT_FISCAL'] } },
        });
        const entrepriseUsers = await this.prisma.user.findMany({
            where: { entrepriseId: alert.entrepriseId ?? undefined },
        });
        const map = new Map();
        admins.forEach((a) => map.set(a.id, a));
        entrepriseUsers.forEach((u) => map.set(u.id, u));
        const recipients = Array.from(map.values());
        for (const u of recipients) {
            const existing = await this.prisma.notification.findFirst({
                where: { userId: u.id, alertId: alert.id },
            });
            if (existing) {
            }
            else {
                await this.prisma.notification.create({
                    data: {
                        userId: u.id,
                        alertId: alert.id,
                        payload: {
                            alertId: alert.id,
                            level: alert.level,
                            type: alert.type,
                            dueDate,
                            movementDescription,
                            movementEntrepriseName,
                            movementEntrepriseNif,
                        },
                    },
                });
                this.gateway.sendToUser(u.id, 'alert.created', {
                    alert: {
                        id: alert.id,
                        type: alert.type,
                        level: alert.level,
                        dueDate,
                        movementDescription,
                        movementEntrepriseName,
                        movementEntrepriseNif,
                    },
                });
            }
        }
        await this.prisma.alert.update({
            where: { id: alert.id },
            data: { notifiedAt: new Date() },
        });
    }
    async getAlertsForUser(user, period, entrepriseId) {
        const u = user ? user : null;
        const baseWhere = {};
        if (u) {
            const roleVal = u['role'];
            const roleStr = typeof roleVal === 'string' ? roleVal.toUpperCase() : '';
            if (roleStr === 'ENTREPRISE') {
                const entrepriseField = u['entreprise'];
                const entIdRaw = u['entrepriseId'] ??
                    (entrepriseField ? entrepriseField['id'] : null) ??
                    null;
                if (!entIdRaw)
                    return [];
                baseWhere['entrepriseId'] = Number(entIdRaw);
            }
            else if (typeof entrepriseId === 'number' && entrepriseId) {
                baseWhere['entrepriseId'] = entrepriseId;
            }
        }
        else if (typeof entrepriseId === 'number' && entrepriseId) {
            baseWhere['entrepriseId'] = entrepriseId;
        }
        let mouvementStart;
        if (period) {
            const now = new Date();
            const p = String(period).toLowerCase();
            if (p === 'week' || p === 'semaine') {
                mouvementStart = new Date(now);
                mouvementStart.setDate(now.getDate() - 7);
            }
            else if (p === 'month' || p === 'mois') {
                mouvementStart = new Date(now);
                mouvementStart.setMonth(now.getMonth() - 1);
            }
            else if (p === 'quarter' || p === 'trimestre') {
                mouvementStart = new Date(now);
                mouvementStart.setMonth(now.getMonth() - 3);
            }
            else if (p === 'year' || p === 'annee' || p === 'année') {
                mouvementStart = new Date(now);
                mouvementStart.setFullYear(now.getFullYear() - 1);
            }
        }
        const allAlerts = await this.prisma.alert.findMany({
            where: baseWhere,
            orderBy: { createdAt: 'desc' },
            include: {
                mouvement: { include: { entreprise: true } },
                entreprise: true,
            },
        });
        let filteredAlerts = allAlerts;
        if (mouvementStart) {
            filteredAlerts = allAlerts.filter((a) => {
                const mov = a.mouvement;
                if (!mov || !mov.createdAt)
                    return false;
                const movDate = new Date(mov.createdAt);
                return movDate >= mouvementStart;
            });
        }
        const mapped = filteredAlerts.map((a) => {
            const mov = a.mouvement;
            const enterpriseName = a.entreprise
                ? (a.entreprise.name ?? null)
                : null;
            const amount = mov ? Math.abs(Number(mov.amount ?? 0)) : 0;
            const created = a.createdAt instanceof Date
                ? a.createdAt
                : new Date(String(a.createdAt ?? Date.now()));
            const parseDate = (v) => {
                if (!v)
                    return null;
                if (v instanceof Date)
                    return v;
                if (typeof v === 'string' || typeof v === 'number') {
                    const d = new Date(String(v));
                    return isNaN(d.getTime()) ? null : d;
                }
                return null;
            };
            let dueDateObj;
            if (mov) {
                const mvRaw = mov['date_mouvement'] ??
                    mov['createdAt'] ??
                    null;
                const mvDate = parseDate(mvRaw);
                dueDateObj = mvDate ?? created;
            }
            else {
                dueDateObj = created;
            }
            const dueDate = dueDateObj.toISOString();
            const monthsSinceCreated = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
            const mouvement = mov
                ? {
                    id: mov.id ?? null,
                    type: mov.type ?? null,
                    description: mov.description ?? null,
                    amount: mov.amount ?? null,
                    estPaiementImpot: Boolean(mov['estPaiementImpot']),
                    createdAt: parseDate(mov['createdAt'])
                        ? parseDate(mov['createdAt']).toISOString()
                        : (mov.createdAt ?? null),
                    date_mouvement: parseDate(mov['date_mouvement'])
                        ? parseDate(mov['date_mouvement']).toISOString()
                        : null,
                    entreprise: mov.entreprise
                        ? {
                            id: mov.entreprise.id ?? null,
                            name: mov.entreprise.name ?? null,
                            siret: mov.entreprise.siret ?? null,
                        }
                        : null,
                }
                : null;
            let niveau = null;
            if (mov) {
                const mvRaw = mov['date_mouvement'] ??
                    mov['createdAt'] ??
                    null;
                const mvDateObj = parseDate(mvRaw);
                if (mvDateObj) {
                    const msPerMonth = 1000 * 60 * 60 * 24 * 30;
                    const ageMonths = Math.floor((Date.now() - mvDateObj.getTime()) / msPerMonth);
                    if (ageMonths <= 1)
                        niveau = 'simple';
                    else if (ageMonths <= 3)
                        niveau = 'warning';
                    else
                        niveau = 'urgent';
                }
            }
            return {
                id: a.id,
                type: a.type ||
                    (mov
                        ? mov.type === 'CREDIT'
                            ? 'Recette'
                            : mov.type === 'TAXPAIMENT'
                                ? 'Taxe'
                                : 'Dépense'
                        : 'Alerte'),
                enterprise: enterpriseName ?? '',
                dueDate,
                amount: amount ?? 0,
                mouvement,
                movementDescription: mov?.description ?? null,
                movementEntrepriseName: mov?.entreprise ? mov.entreprise.name : null,
                movementEntrepriseNif: mov?.entreprise
                    ? (mov.entreprise.siret ?? null)
                    : null,
                priority: a.level === 'high' || a.level === 'urgent'
                    ? 'high'
                    : a.level === 'medium'
                        ? 'medium'
                        : 'low',
                status: a.status || 'open',
                niveau: niveau,
                monthsSinceCreated,
                raw: a,
            };
        });
        return mapped;
    }
    async resolveAlert(alertId) {
        const now = new Date();
        const alert = await this.prisma.alert.update({
            where: { id: alertId },
            data: { status: 'resolved', resolvedAt: now },
        });
        const notifs = await this.prisma.notification.findMany({
            where: { alertId: alertId },
        });
        const userIds = Array.from(new Set(notifs.map((n) => n.userId)));
        await this.prisma.notification.updateMany({
            where: { alertId: alertId },
            data: { read: true },
        });
        for (const uid of userIds) {
            try {
                this.gateway.sendToUser(uid, 'alert.resolved', { alertId });
            }
            catch {
            }
        }
        return alert;
    }
    async deleteAlert(alertId) {
        await this.prisma.notification.deleteMany({ where: { alertId } });
        const deleted = await this.prisma.alert.delete({ where: { id: alertId } });
        try {
            this.gateway.sendToAll('alert.deleted', { alertId });
        }
        catch {
        }
        return deleted;
    }
};
exports.AlertsService = AlertsService;
exports.AlertsService = AlertsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_gateway_1.NotificationsGateway])
], AlertsService);
//# sourceMappingURL=alerts.service.js.map