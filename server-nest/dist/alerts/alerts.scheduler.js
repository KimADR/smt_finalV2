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
exports.AlertsScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma.service");
const alerts_service_1 = require("./alerts.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
let AlertsScheduler = class AlertsScheduler {
    prisma;
    alerts;
    gateway;
    constructor(prisma, alerts, gateway) {
        this.prisma = prisma;
        this.alerts = alerts;
        this.gateway = gateway;
    }
    async checkAndPromoteAlerts() {
        const now = new Date();
        const warnDate = new Date(now);
        warnDate.setDate(warnDate.getDate() - 14);
        const urgentDate = new Date(now);
        urgentDate.setDate(urgentDate.getDate() - 30);
        const toWarn = await this.prisma.alert.findMany({
            where: { status: 'open', level: 'simple', createdAt: { lt: warnDate } },
        });
        for (const a of toWarn) {
            const updated = await this.prisma.alert.update({
                where: { id: a.id },
                data: { level: 'warning' },
            });
            try {
                this.gateway.sendToAll('alert.updated', { alert: updated });
            }
            catch {
            }
            await this.alerts.notifyOnAlert(a);
        }
        const toUrgent = await this.prisma.alert.findMany({
            where: {
                status: 'open',
                level: { in: ['simple', 'warning'] },
                createdAt: { lt: urgentDate },
            },
        });
        for (const a of toUrgent) {
            const updated = await this.prisma.alert.update({
                where: { id: a.id },
                data: { level: 'urgent' },
            });
            try {
                this.gateway.sendToAll('alert.updated', { alert: updated });
            }
            catch {
            }
            await this.alerts.notifyOnAlert(a);
        }
    }
};
exports.AlertsScheduler = AlertsScheduler;
__decorate([
    (0, schedule_1.Cron)('0 0 2 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AlertsScheduler.prototype, "checkAndPromoteAlerts", null);
exports.AlertsScheduler = AlertsScheduler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        alerts_service_1.AlertsService,
        notifications_gateway_1.NotificationsGateway])
], AlertsScheduler);
//# sourceMappingURL=alerts.scheduler.js.map