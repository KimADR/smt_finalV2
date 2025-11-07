import {
  Controller,
  Get,
  Req,
  Patch,
  Param,
  Body,
  UseGuards,
  Delete,
  Query,
} from '@nestjs/common';
import { Post } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { AlertsService } from './alerts.service';

@Controller('api/alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  // Protected read-only list: require a valid JWT so backend always scopes
  // alerts to the authenticated user's permissions (recommended for prod).
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @Req() req?: Request & { user?: AuthUser },
    @Query('period') period?: string,
    @Query('entrepriseId') entrepriseId?: string,
  ) {
    return this.service.getAlertsForUser(
      req?.user ?? null,
      period,
      entrepriseId ? Number(entrepriseId) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/resolve')
  async resolve(@Param('id') id: string) {
    return this.service.resolveAlert(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  // Allow deleting an alert (admin/agent only)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.deleteAlert(Number(id));
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    const alert = await this.service['prisma'].alert.findUnique({
      where: { id: Number(id) },
      include: { entreprise: true, mouvement: true },
    });
    if (!alert) return null;
    // simple scoping: entreprise users only see their entreprise alerts
    const user = req?.user;
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const entId = user.entrepriseId ?? user.entreprise?.id;
      if (Number(entId) !== Number(alert.entrepriseId)) return null;
    }
    return alert;
  }

  // Admin-only helper: create missing notifications for existing alerts
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('backfill-notifications')
  async backfillNotifications(@Req() req?: Request & { user?: AuthUser }) {
    const user = req?.user;
    if (!user) return { ok: false, reason: 'unauthenticated' };
    if (!['ADMIN_FISCAL', 'AGENT_FISCAL'].includes(String(user.role)))
      return { ok: false, reason: 'forbidden' };

    // find alerts that either have no notifiedAt or no notifications
    const alerts = await this.service['prisma'].alert.findMany({
      where: {},
      include: { notifications: true },
    });
    let created = 0;
    for (const a of alerts) {
      if (a.notifications && a.notifications.length > 0) continue;
      // notify recipients similar to AlertsService.notifyOnAlert
      const admins = await this.service['prisma'].user.findMany({
        where: { role: { in: ['ADMIN_FISCAL', 'AGENT_FISCAL'] } },
      });
      const entrepriseUsers = await this.service['prisma'].user.findMany({
        where: { entrepriseId: a.entrepriseId },
      });
      const map = new Map<number, { id: number; role?: string }>();
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

  // Admin-only helper: create alerts for existing mouvements that don't have one yet
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('backfill-mouvements')
  async backfillMouvements(@Req() req?: Request & { user?: AuthUser }) {
    const user = req?.user;
    if (!user) return { ok: false, reason: 'unauthenticated' };
    if (!['ADMIN_FISCAL', 'AGENT_FISCAL'].includes(String(user.role)))
      return { ok: false, reason: 'forbidden' };

    // fetch a batch of mouvements and existing alerts
    const mouvements = await this.service['prisma'].mouvement.findMany({
      take: 1000,
    });
    const mouvementIds = mouvements.map((m) => m.id);
    if (mouvementIds.length === 0) return { ok: true, created: 0 };

    const existingAlerts = await this.service['prisma'].alert.findMany({
      where: { mouvementId: { in: mouvementIds } },
      select: { mouvementId: true },
    });
    const hasAlert = new Set<number>(
      existingAlerts.map((a: { mouvementId: number }) => a.mouvementId),
    );

    let created = 0;
    for (const m of mouvements) {
      if (hasAlert.has(m.id)) continue;
      try {
        await this.service.createForMouvement(m);
        created++;
      } catch (e) {
        console.error(
          '[alerts.backfillMouvements] failed for mouvement',
          m.id,
          e,
        );
      }
    }

    return { ok: true, created };
  }
}
