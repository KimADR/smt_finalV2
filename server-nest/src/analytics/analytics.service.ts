import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { AuthUser } from '../auth/auth.types';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Normalize values returned by Prisma (Decimal) or raw SQL (strings)
  // into plain JS numbers. Defensive: accepts number|string|object|null.
  private normalizeAmount(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number(Number(value).toFixed(2));
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isNaN(n) ? 0 : Number(n.toFixed(2));
    }
    // Try to treat common Decimal-like objects without using `any`
    type DecimalLike = { toNumber?: () => number; toString?: () => string };
    const val = value as DecimalLike;
    if (val && typeof val.toNumber === 'function') {
      const num = val.toNumber();
      const parsed = Number(num);
      return Number.isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
    }
    if (val && typeof val.toString === 'function') {
      const n = Number(val.toString());
      return Number.isNaN(n) ? 0 : Number(n.toFixed(2));
    }
    return 0;
  }

  async summary(period?: string, user?: AuthUser, entrepriseId?: number) {
    // Determine entreprise scope:
    // - If user is ENTREPRISE, always scope to their entrepriseId
    // - Otherwise, if an explicit entrepriseId param is provided, honor it
    let entId = 0;
    const roleUpper = user ? String(user.role).toUpperCase() : '';
    if (roleUpper === 'ENTREPRISE') {
      entId = Number(
        user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0,
      );
    } else if (typeof entrepriseId === 'number' && entrepriseId) {
      entId = entrepriseId;
    }

    const entreprises = entId
      ? await this.prisma.entreprise.count({ where: { id: entId } })
      : await this.prisma.entreprise.count();

    // Interpret period parameter to restrict the time window
    let start: Date | undefined = undefined;
    if (period) {
      const p = String(period).toLowerCase();
      const now = new Date();
      if (p === 'week' || p === 'semaine') {
        start = new Date(now);
        start.setDate(start.getDate() - 7);
      } else if (p === 'month' || p === 'mois') {
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
      } else if (p === 'quarter' || p === 'trimestre') {
        start = new Date(now);
        start.setMonth(start.getMonth() - 3);
      } else if (p === 'year' || p === 'annee' || p === 'année') {
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
      }
    }

    const mouvementWhere: { [k: string]: any } = {};
    if (entId) mouvementWhere['entrepriseId'] = entId;
    if (start) mouvementWhere['createdAt'] = { gte: start };

    const totals = await this.prisma.mouvement.groupBy({
      by: ['type'],
      _sum: { amount: true },
      where: mouvementWhere,
    });
    const credit = this.normalizeAmount(
      totals.find((t) => t.type === 'CREDIT')?._sum.amount,
    );
    const debitAbs = Math.abs(
      this.normalizeAmount(totals.find((t) => t.type === 'DEBIT')?._sum.amount),
    );
    const soldeNet = Number((credit - debitAbs).toFixed(2));
    // naive growth placeholders
    const growthPercent = credit ? (soldeNet / Math.max(credit, 1)) * 100 : 0;
    const depensesGrowthPercent = 0;
    const taxesDue = Math.round(debitAbs * 0.05);
    return {
      entreprises,
      revenusTotal: Number(credit.toFixed(2)),
      depensesTotal: Number(debitAbs.toFixed(2)),
      soldeNet: Number(soldeNet.toFixed(2)),
      growthPercent: Number(growthPercent.toFixed(2)),
      depensesGrowthPercent,
      taxesDue,
    };
  }

  async monthly(
    months = 6,
    user?: AuthUser,
    period?: string,
    entrepriseId?: number,
  ): Promise<Array<{ month: string; revenus: number; depenses: number }>> {
    const now = new Date();
    const start = new Date(now);
    if (period) {
      const p = String(period).toLowerCase();
      if (p === 'week' || p === 'semaine') {
        start.setDate(now.getDate() - 7);
      } else if (p === 'month' || p === 'mois') {
        start.setMonth(now.getMonth() - 1);
      } else if (p === 'quarter' || p === 'trimestre') {
        start.setMonth(now.getMonth() - 3);
      } else if (p === 'year' || p === 'annee' || p === 'année') {
        start.setFullYear(now.getFullYear() - 1);
      } else {
        start.setMonth(now.getMonth() - months);
      }
    } else {
      start.setMonth(now.getMonth() - months);
    }
    let entId = 0;
    const roleUpper = user ? String(user.role).toUpperCase() : '';
    if (roleUpper === 'ENTREPRISE') {
      entId = Number(
        user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0,
      );
    } else if (typeof entrepriseId === 'number' && entrepriseId) {
      entId = entrepriseId;
    }

    let rows: Array<{ month: string; revenus: string; depenses: string }> = [];
    if (entId) {
      rows = (await this.prisma.$queryRaw<
        Array<{ month: string; revenus: string; depenses: string }>
      >`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
          SUM(CASE WHEN "type" = 'CREDIT' THEN "amount" ELSE 0 END) as revenus,
          ABS(SUM(CASE WHEN "type" = 'DEBIT' THEN "amount" ELSE 0 END)) as depenses
        FROM "Mouvement" m
        WHERE m."entrepriseId" = ${entId} AND m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `) as Array<{ month: string; revenus: string; depenses: string }>;
    } else {
      rows = (await this.prisma.$queryRaw<
        Array<{ month: string; revenus: string; depenses: string }>
      >`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
          SUM(CASE WHEN "type" = 'CREDIT' THEN "amount" ELSE 0 END) as revenus,
          ABS(SUM(CASE WHEN "type" = 'DEBIT' THEN "amount" ELSE 0 END)) as depenses
        FROM "Mouvement" m
        WHERE m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `) as Array<{ month: string; revenus: string; depenses: string }>;
    }
    // Normalize string amounts to numbers for the API
    return rows.map((r) => ({
      month: r.month,
      revenus: this.normalizeAmount(r.revenus),
      depenses: this.normalizeAmount(r.depenses),
    }));
  }

  async sector(user?: AuthUser) {
    const entId =
      user && String(user.role).toUpperCase() === 'ENTREPRISE'
        ? Number(user.entrepriseId ?? user.entreprise?.id ?? 0)
        : 0;
    const whereClause = entId ? 'WHERE e.id = $1' : '';
    const params = entId ? [entId] : [];
    const rows = await this.prisma.$queryRawUnsafe(
      `
        SELECT COALESCE("sector", 'Autres') as sector, SUM(CASE WHEN m."type"='CREDIT' THEN m."amount" ELSE 0 END) as revenus
        FROM "Entreprise" e
        LEFT JOIN "Mouvement" m ON m."entrepriseId" = e.id
        ${whereClause}
        GROUP BY 1
        ORDER BY 2 DESC NULLS LAST
      `,
      ...params,
    );
    return (rows as Array<{ sector: string; revenus: string }>).map((r) => ({
      sector: r.sector,
      revenus: this.normalizeAmount(r.revenus),
    }));
  }

  async taxCompliance(user?: AuthUser) {
    const entId =
      user && String(user.role).toUpperCase() === 'ENTREPRISE'
        ? Number(user.entrepriseId ?? user.entreprise?.id ?? 0)
        : 0;
    const rows = (await this.prisma.$queryRaw<
      Array<{ name: string; statut: string }>
    >`
      SELECT e.name,
             CASE WHEN MAX(m."createdAt") >= NOW() - INTERVAL '12 months' THEN 'À jour' ELSE 'En retard' END AS statut
      FROM "Entreprise" e
      LEFT JOIN "Mouvement" m ON m."entrepriseId" = e.id
      WHERE (${entId} = 0 OR e.id = ${entId})
      GROUP BY e.name
    `) as Array<{ name: string; statut: string }>;
    return rows;
  }

  async cashflow(weeks = 4, user?: AuthUser, entrepriseId?: number) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - weeks * 7);
    let entId = 0;
    const roleUpper = user ? String(user.role).toUpperCase() : '';
    if (roleUpper === 'ENTREPRISE') {
      entId = Number(
        user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0,
      );
    } else if (typeof entrepriseId === 'number' && entrepriseId) {
      entId = entrepriseId;
    }
    let rows: Array<{ week: string; total: string }> = [];
    if (entId) {
      rows = (await this.prisma.$queryRaw<
        Array<{ week: string; total: string }>
      >`
        SELECT to_char(date_trunc('week', "createdAt"), 'IYYY-IW') as week,
               SUM("amount") as total
        FROM "Mouvement" m
        WHERE m."entrepriseId" = ${entId} AND m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `) as Array<{ week: string; total: string }>;
    } else {
      rows = (await this.prisma.$queryRaw<
        Array<{ week: string; total: string }>
      >`
        SELECT to_char(date_trunc('week', "createdAt"), 'IYYY-IW') as week,
               SUM("amount") as total
        FROM "Mouvement" m
        WHERE m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `) as Array<{ week: string; total: string }>;
    }
    return rows.map((r) => ({
      week: r.week,
      total: this.normalizeAmount(r.total),
    }));
  }

  async topEnterprises(user?: AuthUser, entrepriseId?: number) {
    // For ENTREPRISE user, return only that entreprise (or empty)
    const roleUpper = user ? String(user.role).toUpperCase() : '';
    if (roleUpper === 'ENTREPRISE') {
      const entId = Number(
        user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0,
      );
      if (!entId) return [];
      const one = await this.prisma.entreprise.findUnique({
        where: { id: entId },
        select: { name: true },
      });
      if (!one) return [];
      return [{ name: one.name, revenus: '0' }];
    }
    // If caller provided entrepriseId explicitly (ADMIN_FISCAL/AGENT_FISCAL), restrict to it
    if (typeof entrepriseId === 'number' && entrepriseId) {
      const one = await this.prisma.entreprise.findUnique({
        where: { id: entrepriseId },
        select: { name: true },
      });
      if (!one) return [];
      return [{ name: one.name, revenus: '0' }];
    }

    const rows = await this.prisma.$queryRawUnsafe(
      `
        SELECT e.name, SUM(m.amount) as revenus
        FROM "Entreprise" e
        JOIN "Mouvement" m ON m."entrepriseId" = e.id
        GROUP BY e.name
        ORDER BY revenus DESC
        LIMIT 5
      `,
    );
    return (rows as Array<{ name: string; revenus: string }>).map((r) => ({
      name: r.name,
      revenus: this.normalizeAmount(r.revenus),
    }));
  }

  async alerts(period?: string, user?: AuthUser, entrepriseId?: number) {
    // prefer explicit entrepriseId for non-ENTREPRISE users
    let entId = 0;
    const roleUpper = user ? String(user.role).toUpperCase() : '';
    if (roleUpper === 'ENTREPRISE') {
      entId = Number(
        user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0,
      );
    } else if (typeof entrepriseId === 'number' && entrepriseId) {
      entId = entrepriseId;
    }
    // compute start date from period if provided
    let start: Date | null = null;
    if (period) {
      const p = String(period).toLowerCase();
      const now = new Date();
      if (p === 'week' || p === 'semaine') {
        start = new Date(now);
        start.setDate(start.getDate() - 7);
      } else if (p === 'month' || p === 'mois') {
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
      } else if (p === 'quarter' || p === 'trimestre') {
        start = new Date(now);
        start.setMonth(start.getMonth() - 3);
      } else if (p === 'year' || p === 'annee' || p === 'année') {
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
      }
    }

    const rows = (await this.prisma.$queryRaw<
      Array<{
        id: string;
        type: string;
        enterprise: string;
        dueDate: Date;
        amount: string;
        priority: string;
        status: string;
        monthsSinceCreated: number;
      }>
    >`
      SELECT 
        CONCAT('ALR-', e.id) as id,
        CASE WHEN RANDOM() > 0.5 THEN 'Déclaration TVA' ELSE 'Rapport trimestriel' END as type,
        e.name as enterprise,
        (NOW() + (RANDOM() * INTERVAL '30 days')) as "dueDate",
        ABS(COALESCE(SUM(m.amount), 0))::numeric(15,2) as amount,
        CASE 
          WHEN RANDOM() > 0.7 THEN 'high'
          WHEN RANDOM() > 0.4 THEN 'medium'
          ELSE 'low'
        END as priority,
        CASE 
          WHEN RANDOM() > 0.7 THEN 'Urgent'
          WHEN RANDOM() > 0.4 THEN 'Attention'
          ELSE 'Info'
        END as status,
        EXTRACT(MONTH FROM (NOW() - COALESCE(MIN(m."createdAt"), NOW())))::int as "monthsSinceCreated"
      FROM "Entreprise" e
      LEFT JOIN "Mouvement" m ON m."entrepriseId" = e.id
      WHERE (${entId} = 0 OR e.id = ${entId})
      ${start ? `AND m."createdAt" >= ${start.toISOString()}::timestamp` : ''}
      GROUP BY e.id, e.name
      ORDER BY amount DESC NULLS LAST
      LIMIT 8
    `) as Array<{
      id: string;
      type: string;
      enterprise: string;
      dueDate: Date;
      amount: string;
      priority: string;
      status: string;
      monthsSinceCreated: number;
    }>;
    // Normalize amount to number for consumers
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      enterprise: r.enterprise,
      dueDate: r.dueDate,
      amount: this.normalizeAmount(r.amount),
      priority: r.priority,
      status: r.status,
      monthsSinceCreated: Number(r.monthsSinceCreated ?? 0),
    }));
  }
}
