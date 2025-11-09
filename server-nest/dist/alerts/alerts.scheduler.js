"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsScheduler = void 0;
const common_1 = require("@nestjs/common");
const cron = __importStar(require("node-cron"));
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
    onModuleInit() {
        cron.schedule('0 0 2 * * *', () => {
            this.checkAndPromoteAlerts();
        });
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
exports.AlertsScheduler = AlertsScheduler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        alerts_service_1.AlertsService,
        notifications_gateway_1.NotificationsGateway])
], AlertsScheduler);
//# sourceMappingURL=alerts.scheduler.js.map