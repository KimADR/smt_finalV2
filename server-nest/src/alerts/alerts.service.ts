import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { Mouvement, Alert, User } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

type MovWithEntreprise = Mouvement & {
  entreprise?: { id?: number; name?: string; siret?: string };
};

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async createForMouvement(m: Mouvement): Promise<Alert> {
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

  async notifyOnAlert(alert: Alert): Promise<void> {
    // load full alert including mouvement + entreprise to enrich payload
    const full = await this.prisma.alert.findUnique({
      where: { id: alert.id },
      include: {
        mouvement: { include: { entreprise: true } },
        entreprise: true,
      },
    });

    // compute movement-derived fields
    const mov = full?.mouvement as MovWithEntreprise | undefined;

    const alertCreated =
      full?.createdAt instanceof Date
        ? full.createdAt
        : new Date(String(full?.createdAt ?? Date.now()));

    const parseDate = (v: unknown): Date | null => {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(String(v));
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };

    let dueDateObj: Date;
    if (mov) {
      const mvRaw =
        (mov as unknown as Record<string, unknown>)['date_mouvement'] ??
        (mov as unknown as Record<string, unknown>)['createdAt'] ??
        null;
      const mvDate = parseDate(mvRaw);
      dueDateObj = mvDate ?? alertCreated;
    } else {
      dueDateObj = alertCreated;
    }

    const dueDate = dueDateObj.toISOString();
    const movementDescription = mov?.description ?? null;
    const movementEntrepriseName = mov?.entreprise ? mov.entreprise.name : null;
    const movementEntrepriseNif = mov?.entreprise?.siret ?? null;

    // get recipients: admins + agents + entreprise users
    const admins: User[] = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN_FISCAL', 'AGENT_FISCAL'] } },
    });

    const entrepriseUsers: User[] = await this.prisma.user.findMany({
      where: { entrepriseId: alert.entrepriseId ?? undefined },
    });

    const map = new Map<number, User>();
    admins.forEach((a) => map.set(a.id, a));
    entrepriseUsers.forEach((u) => map.set(u.id, u));

    const recipients = Array.from(map.values());

    for (const u of recipients) {
      // Avoid creating duplicate notifications for the same user+alert.
      // If a notification already exists (even if previously deleted), do not recreate it
      // to respect user deletion choices.
      const existing = await this.prisma.notification.findFirst({
        where: { userId: u.id, alertId: alert.id },
      });
      if (existing) {
        // If the notification exists and is soft-deleted, leave it deleted.
        // If it exists and is not deleted, we also skip creating a duplicate.
        // Optionally we could update payload/read flags, but to keep user's
        // deletion decision authoritative, we do nothing here.
      } else {
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

    // update notifiedAt
    await this.prisma.alert.update({
      where: { id: alert.id },
      data: { notifiedAt: new Date() },
    });
  }

  async getAlertsForUser(
    user: unknown,
    period?: string,
    entrepriseId?: number,
  ) {
    // If no user is provided (e.g. public dashboard read), return all open alerts.
    // This is a development convenience so the frontend can show existing alerts
    // while debugging auth issues. Production should scope alerts to the
    // authenticated user's permissions.
    const u = user ? (user as Record<string, unknown>) : null;
    // Return alerts without forcing a status filter so the frontend can display
    // resolved alerts in the dashboard card. We still scope by entreprise for
    // users with the ENTREPRISE role.
    const baseWhere: Record<string, unknown> = {};
    if (u) {
      const roleVal = u['role'];
      const roleStr = typeof roleVal === 'string' ? roleVal.toUpperCase() : '';
      if (roleStr === 'ENTREPRISE') {
        const entrepriseField = u['entreprise'] as
          | Record<string, unknown>
          | undefined;
        const entIdRaw =
          u['entrepriseId'] ??
          (entrepriseField ? entrepriseField['id'] : null) ??
          null;
        if (!entIdRaw) return [];
        baseWhere['entrepriseId'] = Number(entIdRaw);
      } else if (typeof entrepriseId === 'number' && entrepriseId) {
        // admins may request alerts for a specific entreprise
        baseWhere['entrepriseId'] = entrepriseId;
      }
    } else if (typeof entrepriseId === 'number' && entrepriseId) {
      // public/no-user call but explicit entrepriseId provided (dev usage)
      baseWhere['entrepriseId'] = entrepriseId;
    }

    // Filtrage par période sur la date du mouvement associé
    let mouvementStart: Date | undefined;
    if (period) {
      const now = new Date();
      const p = String(period).toLowerCase();
      if (p === 'week' || p === 'semaine') {
        mouvementStart = new Date(now);
        mouvementStart.setDate(now.getDate() - 7);
      } else if (p === 'month' || p === 'mois') {
        mouvementStart = new Date(now);
        mouvementStart.setMonth(now.getMonth() - 1);
      } else if (p === 'quarter' || p === 'trimestre') {
        mouvementStart = new Date(now);
        mouvementStart.setMonth(now.getMonth() - 3);
      } else if (p === 'year' || p === 'annee' || p === 'année') {
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

    // Si filtrage période, ne garder que les alertes dont le mouvement associé est dans la période
    let filteredAlerts = allAlerts;
    if (mouvementStart) {
      filteredAlerts = allAlerts.filter((a) => {
        const mov = a.mouvement;
        if (!mov || !mov.createdAt) return false;
        const movDate = new Date(mov.createdAt);
        return movDate >= mouvementStart;
      });
    }

    // (already loaded allAlerts above, reuse filteredAlerts for mapping)

    // Map to frontend-friendly TaxAlerts shape consumed by the dashboard UI
    const mapped = filteredAlerts.map((a) => {
      // mouvement may be included with nested entreprise when we asked for it
      const mov = a.mouvement as MovWithEntreprise | null;

      const enterpriseName = a.entreprise
        ? ((a.entreprise as { name?: string }).name ?? null)
        : null;
      const amount = mov ? Math.abs(Number(mov.amount ?? 0)) : 0;

      const created =
        a.createdAt instanceof Date
          ? a.createdAt
          : new Date(String(a.createdAt ?? Date.now()));
      // Determine dueDate: prefer mouvement.date_mouvement, then mouvement.createdAt, then alert.createdAt
      const parseDate = (v: unknown): Date | null => {
        if (!v) return null;
        if (v instanceof Date) return v;
        if (typeof v === 'string' || typeof v === 'number') {
          const d = new Date(String(v));
          return isNaN(d.getTime()) ? null : d;
        }
        return null;
      };
      let dueDateObj: Date;
      if (mov) {
        const mvRaw =
          (mov as unknown as Record<string, unknown>)['date_mouvement'] ??
          (mov as unknown as Record<string, unknown>)['createdAt'] ??
          null;
        const mvDate = parseDate(mvRaw);
        dueDateObj = mvDate ?? created;
      } else {
        dueDateObj = created;
      }

      const dueDate = dueDateObj.toISOString();

      const monthsSinceCreated = Math.floor(
        (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );

      // expose mouvement details, including explicit type
      const mouvement = mov
        ? {
            id: mov.id ?? null,
            type: mov.type ?? null,
            description: mov.description ?? null,
            amount: mov.amount ?? null,
            estPaiementImpot: Boolean(
              (mov as unknown as Record<string, unknown>)['estPaiementImpot'],
            ),
            // include explicit date fields so frontend can use them
            createdAt: parseDate(
              (mov as unknown as Record<string, unknown>)['createdAt'],
            )
              ? parseDate(
                  (mov as unknown as Record<string, unknown>)['createdAt'],
                )!.toISOString()
              : (mov.createdAt ?? null),
            date_mouvement: parseDate(
              (mov as unknown as Record<string, unknown>)['date_mouvement'],
            )
              ? parseDate(
                  (mov as unknown as Record<string, unknown>)['date_mouvement'],
                )!.toISOString()
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

      // compute niveau from mouvement date (prioritize mouvement date)
      let niveau: 'simple' | 'warning' | 'urgent' | null = null;
      if (mov) {
        const mvRaw =
          (mov as unknown as Record<string, unknown>)['date_mouvement'] ??
          (mov as unknown as Record<string, unknown>)['createdAt'] ??
          null;
        const mvDateObj = parseDate(mvRaw);
        if (mvDateObj) {
          const msPerMonth = 1000 * 60 * 60 * 24 * 30;
          const ageMonths = Math.floor(
            (Date.now() - mvDateObj.getTime()) / msPerMonth,
          );
          // thresholds: 1 month -> simple, 3 months -> warning, >3 months -> urgent
          if (ageMonths <= 1) niveau = 'simple';
          else if (ageMonths <= 3) niveau = 'warning';
          else niveau = 'urgent';
        }
      }

      return {
        id: a.id,
        type:
          a.type ||
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
        // legacy fields for compatibility
        movementDescription: mov?.description ?? null,
        movementEntrepriseName: mov?.entreprise ? mov.entreprise.name : null,
        movementEntrepriseNif: mov?.entreprise
          ? (mov.entreprise.siret ?? null)
          : null,
        priority:
          a.level === 'high' || a.level === 'urgent'
            ? 'high'
            : a.level === 'medium'
              ? 'medium'
              : 'low',
        status: a.status || 'open',
        // computed niveau (frontend will prioritize mouvement date if present)
        niveau: niveau,
        monthsSinceCreated,
        raw: a,
      };
    });

    return mapped;
  }

  /**
   * Resolve an alert: mark alert as resolved, mark related notifications as read,
   * and notify affected users via WebSocket so their UI can update.
   */
  async resolveAlert(alertId: number) {
    const now = new Date();
    const alert = await this.prisma.alert.update({
      where: { id: alertId },
      data: { status: 'resolved', resolvedAt: now },
    });

    // find all notifications for this alert
    const notifs = await this.prisma.notification.findMany({
      where: { alertId: alertId },
    });
    const userIds = Array.from(new Set(notifs.map((n) => n.userId)));

    // mark notifications as read (we keep them but read=true) so they won't show as unread in the bell
    await this.prisma.notification.updateMany({
      where: { alertId: alertId },
      data: { read: true },
    });

    // notify connected users to update their list
    for (const uid of userIds) {
      try {
        this.gateway.sendToUser(uid, 'alert.resolved', { alertId });
      } catch {
        // ignore per-user notify failures
      }
    }

    return alert;
  }

  /**
   * Delete an alert and its notifications. Only for admin/guarded callers.
   */
  async deleteAlert(alertId: number) {
    // delete notifications related to the alert first
    await this.prisma.notification.deleteMany({ where: { alertId } });
    // delete the alert itself
    const deleted = await this.prisma.alert.delete({ where: { id: alertId } });

    // notify connected users that the alert was removed so they can update UI
    try {
      this.gateway.sendToAll('alert.deleted', { alertId });
    } catch {
      // ignore notify errors
    }

    return deleted;
  }
}
