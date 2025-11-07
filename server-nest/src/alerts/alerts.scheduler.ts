import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { AlertsService } from './alerts.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class AlertsScheduler {
  constructor(
    private prisma: PrismaService,
    private alerts: AlertsService,
    private gateway: NotificationsGateway,
  ) {}

  // daily at 02:00
  @Cron('0 0 2 * * *')
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
