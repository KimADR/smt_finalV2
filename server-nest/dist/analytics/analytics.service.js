"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeAmount(value) {
        if (value === null || value === undefined)
            return 0;
        if (typeof value === 'number')
            return Number(Number(value).toFixed(2));
        if (typeof value === 'string') {
            const n = Number(value);
            return Number.isNaN(n) ? 0 : Number(n.toFixed(2));
        }
        const val = value;
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
    async summary(period, user, entrepriseId) {
        let entId = 0;
        const roleUpper = user ? String(user.role).toUpperCase() : '';
        if (roleUpper === 'ENTREPRISE') {
            entId = Number(user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0);
        }
        else if (typeof entrepriseId === 'number' && entrepriseId) {
            entId = entrepriseId;
        }
        const entreprises = entId
            ? await this.prisma.entreprise.count({ where: { id: entId } })
            : await this.prisma.entreprise.count();
        let start = undefined;
        if (period) {
            const p = String(period).toLowerCase();
            const now = new Date();
            if (p === 'week' || p === 'semaine') {
                start = new Date(now);
                start.setDate(start.getDate() - 7);
            }
            else if (p === 'month' || p === 'mois') {
                start = new Date(now);
                start.setMonth(start.getMonth() - 1);
            }
            else if (p === 'quarter' || p === 'trimestre') {
                start = new Date(now);
                start.setMonth(start.getMonth() - 3);
            }
            else if (p === 'year' || p === 'annee' || p === 'année') {
                start = new Date(now);
                start.setFullYear(start.getFullYear() - 1);
            }
        }
        const mouvementWhere = {};
        if (entId)
            mouvementWhere['entrepriseId'] = entId;
        if (start)
            mouvementWhere['createdAt'] = { gte: start };
        const totals = await this.prisma.mouvement.groupBy({
            by: ['type'],
            _sum: { amount: true },
            where: mouvementWhere,
        });
        const credit = this.normalizeAmount(totals.find((t) => t.type === 'CREDIT')?._sum.amount);
        const debitAbs = Math.abs(this.normalizeAmount(totals.find((t) => t.type === 'DEBIT')?._sum.amount));
        const soldeNet = Number((credit - debitAbs).toFixed(2));
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
    async monthly(months = 6, user, period, entrepriseId) {
        const now = new Date();
        const start = new Date(now);
        if (period) {
            const p = String(period).toLowerCase();
            if (p === 'week' || p === 'semaine') {
                start.setDate(now.getDate() - 7);
            }
            else if (p === 'month' || p === 'mois') {
                start.setMonth(now.getMonth() - 1);
            }
            else if (p === 'quarter' || p === 'trimestre') {
                start.setMonth(now.getMonth() - 3);
            }
            else if (p === 'year' || p === 'annee' || p === 'année') {
                start.setFullYear(now.getFullYear() - 1);
            }
            else {
                start.setMonth(now.getMonth() - months);
            }
        }
        else {
            start.setMonth(now.getMonth() - months);
        }
        let entId = 0;
        const roleUpper = user ? String(user.role).toUpperCase() : '';
        if (roleUpper === 'ENTREPRISE') {
            entId = Number(user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0);
        }
        else if (typeof entrepriseId === 'number' && entrepriseId) {
            entId = entrepriseId;
        }
        let rows = [];
        if (entId) {
            rows = (await this.prisma.$queryRaw `
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
          SUM(CASE WHEN "type" = 'CREDIT' THEN "amount" ELSE 0 END) as revenus,
          ABS(SUM(CASE WHEN "type" = 'DEBIT' THEN "amount" ELSE 0 END)) as depenses
        FROM "Mouvement" m
        WHERE m."entrepriseId" = ${entId} AND m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `);
        }
        else {
            rows = (await this.prisma.$queryRaw `
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
          SUM(CASE WHEN "type" = 'CREDIT' THEN "amount" ELSE 0 END) as revenus,
          ABS(SUM(CASE WHEN "type" = 'DEBIT' THEN "amount" ELSE 0 END)) as depenses
        FROM "Mouvement" m
        WHERE m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `);
        }
        return rows.map((r) => ({
            month: r.month,
            revenus: this.normalizeAmount(r.revenus),
            depenses: this.normalizeAmount(r.depenses),
        }));
    }
    async sector(user) {
        const entId = user && String(user.role).toUpperCase() === 'ENTREPRISE'
            ? Number(user.entrepriseId ?? user.entreprise?.id ?? 0)
            : 0;
        const whereClause = entId ? 'WHERE e.id = $1' : '';
        const params = entId ? [entId] : [];
        const rows = await this.prisma.$queryRawUnsafe(`
        SELECT COALESCE("sector", 'Autres') as sector, SUM(CASE WHEN m."type"='CREDIT' THEN m."amount" ELSE 0 END) as revenus
        FROM "Entreprise" e
        LEFT JOIN "Mouvement" m ON m."entrepriseId" = e.id
        ${whereClause}
        GROUP BY 1
        ORDER BY 2 DESC NULLS LAST
      `, ...params);
        return rows.map((r) => ({
            sector: r.sector,
            revenus: this.normalizeAmount(r.revenus),
        }));
    }
    async taxCompliance(user) {
        const entId = user && String(user.role).toUpperCase() === 'ENTREPRISE'
            ? Number(user.entrepriseId ?? user.entreprise?.id ?? 0)
            : 0;
        const rows = (await this.prisma.$queryRaw `
      SELECT e.name,
             CASE WHEN MAX(m."createdAt") >= NOW() - INTERVAL '12 months' THEN 'À jour' ELSE 'En retard' END AS statut
      FROM "Entreprise" e
      LEFT JOIN "Mouvement" m ON m."entrepriseId" = e.id
      WHERE (${entId} = 0 OR e.id = ${entId})
      GROUP BY e.name
    `);
        return rows;
    }
    async cashflow(weeks = 4, user, entrepriseId) {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - weeks * 7);
        let entId = 0;
        const roleUpper = user ? String(user.role).toUpperCase() : '';
        if (roleUpper === 'ENTREPRISE') {
            entId = Number(user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0);
        }
        else if (typeof entrepriseId === 'number' && entrepriseId) {
            entId = entrepriseId;
        }
        let rows = [];
        if (entId) {
            rows = (await this.prisma.$queryRaw `
        SELECT to_char(date_trunc('week', "createdAt"), 'IYYY-IW') as week,
               SUM("amount") as total
        FROM "Mouvement" m
        WHERE m."entrepriseId" = ${entId} AND m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `);
        }
        else {
            rows = (await this.prisma.$queryRaw `
        SELECT to_char(date_trunc('week', "createdAt"), 'IYYY-IW') as week,
               SUM("amount") as total
        FROM "Mouvement" m
        WHERE m."createdAt" >= ${start.toISOString()}::timestamp
        GROUP BY 1
        ORDER BY 1
      `);
        }
        return rows.map((r) => ({
            week: r.week,
            total: this.normalizeAmount(r.total),
        }));
    }
    async topEnterprises(user, entrepriseId) {
        const roleUpper = user ? String(user.role).toUpperCase() : '';
        if (roleUpper === 'ENTREPRISE') {
            const entId = Number(user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0);
            if (!entId)
                return [];
            const one = await this.prisma.entreprise.findUnique({
                where: { id: entId },
                select: { name: true },
            });
            if (!one)
                return [];
            return [{ name: one.name, revenus: '0' }];
        }
        if (typeof entrepriseId === 'number' && entrepriseId) {
            const one = await this.prisma.entreprise.findUnique({
                where: { id: entrepriseId },
                select: { name: true },
            });
            if (!one)
                return [];
            return [{ name: one.name, revenus: '0' }];
        }
        const rows = await this.prisma.$queryRawUnsafe(`
        SELECT e.name, SUM(m.amount) as revenus
        FROM "Entreprise" e
        JOIN "Mouvement" m ON m."entrepriseId" = e.id
        GROUP BY e.name
        ORDER BY revenus DESC
        LIMIT 5
      `);
        return rows.map((r) => ({
            name: r.name,
            revenus: this.normalizeAmount(r.revenus),
        }));
    }
    async alerts(period, user, entrepriseId) {
        let entId = 0;
        const roleUpper = user ? String(user.role).toUpperCase() : '';
        if (roleUpper === 'ENTREPRISE') {
            entId = Number(user ? (user.entrepriseId ?? user.entreprise?.id ?? 0) : 0);
        }
        else if (typeof entrepriseId === 'number' && entrepriseId) {
            entId = entrepriseId;
        }
        let start = null;
        if (period) {
            const p = String(period).toLowerCase();
            const now = new Date();
            if (p === 'week' || p === 'semaine') {
                start = new Date(now);
                start.setDate(start.getDate() - 7);
            }
            else if (p === 'month' || p === 'mois') {
                start = new Date(now);
                start.setMonth(start.getMonth() - 1);
            }
            else if (p === 'quarter' || p === 'trimestre') {
                start = new Date(now);
                start.setMonth(start.getMonth() - 3);
            }
            else if (p === 'year' || p === 'annee' || p === 'année') {
                start = new Date(now);
                start.setFullYear(start.getFullYear() - 1);
            }
        }
        const rows = (await this.prisma.$queryRaw `
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
    `);
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map