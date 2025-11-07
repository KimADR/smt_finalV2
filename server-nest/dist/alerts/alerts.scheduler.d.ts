import { PrismaService } from '../prisma.service';
import { AlertsService } from './alerts.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
export declare class AlertsScheduler {
    private prisma;
    private alerts;
    private gateway;
    constructor(prisma: PrismaService, alerts: AlertsService, gateway: NotificationsGateway);
    checkAndPromoteAlerts(): Promise<void>;
}
