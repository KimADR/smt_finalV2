/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

import {
  Controller,
  Get,
  Patch,
  Param,
  Req,
  ForbiddenException,
  Delete,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import type { AuthUser } from '../auth/auth.types';
import type { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Req() req?: Request & { user?: AuthUser }) {
    // NOTE: For developer convenience we return notifications even when the
    // request is not authenticated (no req.user). This ensures the frontend
    // can display existing notifications/alerts while debugging or when the
    // Authorization header is not present. Mutation endpoints (PATCH/DELETE)
    // still enforce ownership checks below.
    // If you want to restrict visibility to authenticated users only,
    // reintroduce the auth check here.
    // If a user is authenticated, only return notifications belonging to that user.
    // If no user is provided (developer convenience), return recent notifications.

    // By default only return notifications that are not deleted
    const whereClause: Prisma.NotificationWhereInput = { deleted: false };
    const user = req?.user as AuthUser | undefined;
    if (user) {
      // Default for non-entreprise users: only their notifications
      const role = String(user.role).toUpperCase();

      // If the user is an ENTREPRISE user we allow two cases:
      // - notifications explicitly addressed to that user (userId)
      // - notifications whose related alert belongs to the same entreprise
      // This lets entreprise users see company-wide alerts/notifications
      // while preserving per-user notifications for everyone else.
      if (role === 'ENTREPRISE') {
        try {
          const entIdRaw =
            (user as any).entrepriseId ?? (user as any).entreprise?.id ?? null;
          const entId = entIdRaw ? Number(entIdRaw) : null;
          if (entId) {
            whereClause.OR = [
              { userId: Number(user.id) },
              { alert: { entrepriseId: entId } },
            ];
          } else {
            // fallback to per-user scoping if we couldn't determine entreprise id
            whereClause.userId = Number(user.id);
          }
        } catch {
          whereClause.userId = Number(user.id);
        }
      } else {
        // ADMIN_FISCAL and AGENT_FISCAL may view all notifications (no per-user filter)
        const nonRestrictedRoles = ['ADMIN_FISCAL', 'AGENT_FISCAL'];
        if (!nonRestrictedRoles.includes(role)) {
          // other roles (regular users) only see their own notifications
          whereClause.userId = Number(user.id);
        }
      }
    }

    const rows = await this.prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { alert: { include: { mouvement: true, entreprise: true } } },
      take: 200,
    });

    // Enrich each notification payload with computed movement fields so the
    // frontend can rely on payload.dueDate / movementDescription / movementEntrepriseName / movementEntrepriseNif
    const mapped = rows.map((n) => {
      const alert = (n as any).alert ?? null;
      const mov = alert?.mouvement ?? null;

      // compute dueDate: prefer mouvement.date_mouvement -> mouvement.createdAt -> alert.createdAt -> notification.createdAt
      let dueDate: string | null = null;
      if (mov) {
        const mvDate = mov.date_mouvement ?? mov.createdAt ?? null;
        dueDate = mvDate
          ? mvDate instanceof Date
            ? mvDate.toISOString()
            : String(mvDate)
          : null;
      }
      if (!dueDate && alert?.createdAt) {
        dueDate =
          alert.createdAt instanceof Date
            ? alert.createdAt.toISOString()
            : String(alert.createdAt);
      }
      if (!dueDate) {
        dueDate =
          n.createdAt instanceof Date
            ? n.createdAt.toISOString()
            : String(n.createdAt);
      }

      const movementDescription = mov?.description ?? null;
      const movementEntrepriseName =
        mov?.entreprise?.name ?? alert?.entreprise?.name ?? null;
      const movementEntrepriseNif =
        mov?.entreprise?.siret ?? alert?.entreprise?.siret ?? null;

      const payloadBase =
        typeof n.payload === 'object' && n.payload !== null
          ? (n.payload as Record<string, unknown>)
          : {};
      const payload = {
        ...payloadBase,
        alert,
        dueDate,
        movementDescription,
        movementEntrepriseName,
        movementEntrepriseNif,
      };

      return {
        id: n.id,
        userId: n.userId,
        alertId: n.alertId,
        payload,
        read: n.read,
        deleted: (n as any).deleted ?? false,
        deletedAt: (n as any).deletedAt ?? null,
        createdAt: n.createdAt,
      };
    });

    return mapped;
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(
    @Param('id') id: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    const user = req?.user;
    // Also log whether Authorization header was present (do not print full token)
    // This helps debug cases where Passport didn't populate req.user
    const authHeader = (req as any)?.headers?.authorization as
      | string
      | undefined;
    console.debug(
      '[NotificationsController] markRead auth header present',
      !!authHeader,
      authHeader ? `${authHeader.slice(0, 20)}...` : null,
    );
    // Debug log to help diagnose permission issues (403)
    // NOTE: remove or lower verbosity in production
    console.debug('[NotificationsController] markRead called', {
      id: Number(id),
      user: user ? { id: user.id, role: user.role } : null,
    });
    if (!user) throw new ForbiddenException();
    const notif = await this.prisma.notification.findUnique({
      where: { id: Number(id) },
      include: { alert: true },
    });

    console.debug('[NotificationsController] markRead fetched notif', {
      notif: notif
        ? {
            id: notif.id,
            userId: notif.userId,
            alertId: notif.alertId,
            alertEntrepriseId: notif.alert?.entrepriseId,
          }
        : null,
    });

    if (!notif) throw new ForbiddenException();

    // allow when the notification is for the user
    // additionally allow ADMIN_FISCAL and AGENT_FISCAL to act on notifications
    // and allow ENTREPRISE users when the related alert belongs to their entreprise
    const isOwner = notif.userId === Number(user.id);
    let allowed = isOwner;
    try {
      const roleStr = String(user.role).toUpperCase();
      if (
        !allowed &&
        (roleStr === 'ADMIN_FISCAL' || roleStr === 'AGENT_FISCAL')
      ) {
        allowed = true;
      }

      if (!allowed && roleStr === 'ENTREPRISE') {
        const entIdRaw =
          (user as AuthUser).entrepriseId ??
          (user as AuthUser).entreprise?.id ??
          null;
        const entId = entIdRaw ? Number(entIdRaw) : null;
        if (entId && notif.alert?.entrepriseId === entId) {
          allowed = true;
        }
      }
    } catch {
      // ignore and use isOwner
    }

    if (!allowed) throw new ForbiddenException();

    return this.prisma.notification.update({
      where: { id: Number(id) },
      data: { read: true },
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    const user = req?.user;
    const authHeader = (req as any)?.headers?.authorization as
      | string
      | undefined;
    console.debug(
      '[NotificationsController] remove auth header present',
      !!authHeader,
      authHeader ? `${authHeader.slice(0, 20)}...` : null,
    );
    // Debug log to help diagnose permission issues (403)
    console.debug('[NotificationsController] remove called', {
      id: Number(id),
      user: user ? { id: user.id, role: user.role } : null,
    });
    if (!user) throw new ForbiddenException();
    const notif = await this.prisma.notification.findUnique({
      where: { id: Number(id) },
      include: { alert: true },
    });

    console.debug('[NotificationsController] remove fetched notif', {
      notif: notif
        ? {
            id: notif.id,
            userId: notif.userId,
            alertId: notif.alertId,
            alertEntrepriseId: notif.alert?.entrepriseId,
          }
        : null,
    });
    if (!notif) throw new ForbiddenException();

    const isOwner = notif.userId === Number(user.id);
    let allowed = isOwner;
    try {
      const roleStr = String(user.role).toUpperCase();
      if (
        !allowed &&
        (roleStr === 'ADMIN_FISCAL' || roleStr === 'AGENT_FISCAL')
      ) {
        allowed = true;
      }

      if (!allowed && roleStr === 'ENTREPRISE') {
        const entIdRaw =
          (user as AuthUser).entrepriseId ??
          (user as AuthUser).entreprise?.id ??
          null;
        const entId = entIdRaw ? Number(entIdRaw) : null;
        if (entId && notif.alert?.entrepriseId === entId) {
          allowed = true;
        }
      }
    } catch {
      // ignore and rely on owner check
    }

    if (!allowed) throw new ForbiddenException();

    try {
      // Soft-delete: mark the notification as deleted so we remember the
      // user's intent and avoid recreating it later when alerts are reprocessed.
      const updated = await this.prisma.notification.update({
        where: { id: Number(id) },
        data: { deleted: true, deletedAt: new Date() },
      });

      console.debug('[NotificationsController] remove soft-deleted', {
        id: updated.id,
      });

      return {
        success: true,
        id: updated.id,
      };
    } catch (err: any) {
      // If the record was already removed between the find and update, treat as success
      // Prisma throws P2025 for 'Record to delete does not exist.'
      if (err && (err.code === 'P2025' || err.code === 'P2025')) {
        return { success: true, id: Number(id) };
      }
      console.error('[NotificationsController] remove error', err);
      throw err;
    }
  }
}
