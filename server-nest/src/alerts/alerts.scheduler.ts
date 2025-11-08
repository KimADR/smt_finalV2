import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../prisma.service';
import { AlertsService } from './alerts.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class AlertsScheduler implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private alerts: AlertsService,
    private gateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    // Schedule the task to run daily at 02:00
    cron.schedule('0 0 2 * * *', () => {
      this.checkAndPromoteAlerts();
    });

  }

  private async checkAndPromoteAlerts() {
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
      // Send alert.updated for level change + standard notification
      try {
        this.gateway.sendToAll('alert.updated', { alert: updated });
      } catch {
        // ignore notify errors
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
      // Send alert.updated for level change + standard notification
      try {
        this.gateway.sendToAll('alert.updated', { alert: updated });
      } catch {
        // ignore notify errors
      }
      await this.alerts.notifyOnAlert(a);
    }
  }
}
