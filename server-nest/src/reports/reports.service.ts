import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import type { Prisma } from '@prisma/client';

export type ReportRow = {
  id: number;
  entrepriseId: number;
  entrepriseName?: string;
  entrepriseNif?: string | null;
  date: string; // ISO
  amount: number;
  description?: string | null;
  type?: string | null;
};

type ListFilters = {
  from?: string;
  to?: string;
  entrepriseId?: string;
  type?: string;
  page?: string;
  pageSize?: string;
  limit?: number;
};

export type ListFiltersExport = ListFilters;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(s?: string): Date | null {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime()))
      throw new BadRequestException('date invalide');
    return d;
  }

  private parsePositiveInt(s?: string, defaultVal = 1): number {
    if (!s) return defaultVal;
    const n = Number(s);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
      throw new BadRequestException('entier attendu');
    return n;
  }

  async list(filters: ListFilters, user?: AuthUser) {
    const fromDate = this.parseDate(filters.from);
    const toDate = this.parseDate(filters.to);
    let entrepriseId = filters.entrepriseId
      ? Number(filters.entrepriseId)
      : undefined;
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const ent = user.entrepriseId ?? user.entreprise?.id ?? undefined;
      if (ent) {
        entrepriseId = Number(ent);
      } else {
        // user has no entreprise assigned -> empty result
        return { rows: [], total: 0, page: 1, pageSize: 0 };
      }
    }
    if (
      filters.entrepriseId &&
      (!Number.isFinite(entrepriseId) || entrepriseId! <= 0)
    )
      throw new BadRequestException('entrepriseId invalide');

    const page = this.parsePositiveInt(filters.page, 1);
    const pageSize = Math.min(
      this.parsePositiveInt(filters.pageSize, 200),
      2000,
    );

    const where: Prisma.MouvementWhereInput = {};
    let createdAtFilter: Prisma.DateTimeFilter | undefined = undefined;
    if (fromDate) {
      createdAtFilter = {
        ...(createdAtFilter ?? {}),
        gte: fromDate,
      } as Prisma.DateTimeFilter;
    }
    if (toDate) {
      createdAtFilter = {
        ...(createdAtFilter ?? {}),
        lte: toDate,
      } as Prisma.DateTimeFilter;
    }
    if (createdAtFilter) where.createdAt = createdAtFilter;
    if (entrepriseId) where.entrepriseId = entrepriseId;

    const total = await this.prisma.mouvement.count({ where });
    const rows = await this.prisma.mouvement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        entreprise: { select: { id: true, name: true, siret: true } },
      },
    });

    const normalized: ReportRow[] = rows.map((r) => ({
      id: Number(r.id),
      entrepriseId: Number(r.entrepriseId),
      entrepriseName: r.entreprise?.name,
      entrepriseNif: (r.entreprise?.siret as string) ?? null,
      date:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      amount: Number(r.amount),
      description: r.description ?? null,
      type: r.type ?? null,
    }));

    return { rows: normalized, total, page, pageSize };
  }

  // for export endpoints -- return flat array with optional limit
  async listAll(filters: ListFilters & { limit?: number }, user?: AuthUser) {
    const fromDate = this.parseDate(filters.from);
    const toDate = this.parseDate(filters.to);
    let entrepriseId = filters.entrepriseId
      ? Number(filters.entrepriseId)
      : undefined;
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const ent = user.entrepriseId ?? user.entreprise?.id ?? undefined;
      if (ent) entrepriseId = Number(ent);
      else return [];
    }
    if (
      filters.entrepriseId &&
      (!Number.isFinite(entrepriseId) || entrepriseId! <= 0)
    )
      throw new BadRequestException('entrepriseId invalide');

    const where: Prisma.MouvementWhereInput = {};
    let createdAtFilter: Prisma.DateTimeFilter | undefined = undefined;
    if (fromDate) {
      createdAtFilter = {
        ...(createdAtFilter ?? {}),
        gte: fromDate,
      } as Prisma.DateTimeFilter;
    }
    if (toDate) {
      createdAtFilter = {
        ...(createdAtFilter ?? {}),
        lte: toDate,
      } as Prisma.DateTimeFilter;
    }
    if (createdAtFilter) where.createdAt = createdAtFilter;
    if (entrepriseId) where.entrepriseId = entrepriseId;

    const rows = await this.prisma.mouvement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 1000,
      include: {
        entreprise: { select: { id: true, name: true, siret: true } },
      },
    });

    return rows.map((r) => ({
      id: Number(r.id),
      entrepriseId: Number(r.entrepriseId),
      entrepriseName: r.entreprise?.name,
      entrepriseNif: (r.entreprise?.siret as string) ?? null,
      date:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      amount: Number(r.amount),
      description: r.description ?? null,
      type: r.type ?? null,
    }));
  }
}
