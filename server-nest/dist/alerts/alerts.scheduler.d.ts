import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AlertsService } from './alerts.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
export declare class AlertsScheduler implements OnModuleInit {
    private prisma;
    private alerts;
    private gateway;
    constructor(prisma: PrismaService, alerts: AlertsService, gateway: NotificationsGateway);
    onModuleInit(): void;
    private checkAndPromoteAlerts;
}
