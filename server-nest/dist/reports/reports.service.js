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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    parseDate(s) {
        if (!s)
            return null;
        const d = new Date(s);
        if (Number.isNaN(d.getTime()))
            throw new common_1.BadRequestException('date invalide');
        return d;
    }
    parsePositiveInt(s, defaultVal = 1) {
        if (!s)
            return defaultVal;
        const n = Number(s);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
            throw new common_1.BadRequestException('entier attendu');
        return n;
    }
    async list(filters, user) {
        const fromDate = this.parseDate(filters.from);
        const toDate = this.parseDate(filters.to);
        let entrepriseId = filters.entrepriseId
            ? Number(filters.entrepriseId)
            : undefined;
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const ent = user.entrepriseId ?? user.entreprise?.id ?? undefined;
            if (ent) {
                entrepriseId = Number(ent);
            }
            else {
                return { rows: [], total: 0, page: 1, pageSize: 0 };
            }
        }
        if (filters.entrepriseId &&
            (!Number.isFinite(entrepriseId) || entrepriseId <= 0))
            throw new common_1.BadRequestException('entrepriseId invalide');
        const page = this.parsePositiveInt(filters.page, 1);
        const pageSize = Math.min(this.parsePositiveInt(filters.pageSize, 200), 2000);
        const where = {};
        let createdAtFilter = undefined;
        if (fromDate) {
            createdAtFilter = {
                ...(createdAtFilter ?? {}),
                gte: fromDate,
            };
        }
        if (toDate) {
            createdAtFilter = {
                ...(createdAtFilter ?? {}),
                lte: toDate,
            };
        }
        if (createdAtFilter)
            where.createdAt = createdAtFilter;
        if (entrepriseId)
            where.entrepriseId = entrepriseId;
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
        const normalized = rows.map((r) => ({
            id: Number(r.id),
            entrepriseId: Number(r.entrepriseId),
            entrepriseName: r.entreprise?.name,
            entrepriseNif: r.entreprise?.siret ?? null,
            date: r.createdAt instanceof Date
                ? r.createdAt.toISOString()
                : String(r.createdAt),
            amount: Number(r.amount),
            description: r.description ?? null,
            type: r.type ?? null,
        }));
        return { rows: normalized, total, page, pageSize };
    }
    async listAll(filters, user) {
        const fromDate = this.parseDate(filters.from);
        const toDate = this.parseDate(filters.to);
        let entrepriseId = filters.entrepriseId
            ? Number(filters.entrepriseId)
            : undefined;
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const ent = user.entrepriseId ?? user.entreprise?.id ?? undefined;
            if (ent)
                entrepriseId = Number(ent);
            else
                return [];
        }
        if (filters.entrepriseId &&
            (!Number.isFinite(entrepriseId) || entrepriseId <= 0))
            throw new common_1.BadRequestException('entrepriseId invalide');
        const where = {};
        let createdAtFilter = undefined;
        if (fromDate) {
            createdAtFilter = {
                ...(createdAtFilter ?? {}),
                gte: fromDate,
            };
        }
        if (toDate) {
            createdAtFilter = {
                ...(createdAtFilter ?? {}),
                lte: toDate,
            };
        }
        if (createdAtFilter)
            where.createdAt = createdAtFilter;
        if (entrepriseId)
            where.entrepriseId = entrepriseId;
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
            entrepriseNif: r.entreprise?.siret ?? null,
            date: r.createdAt instanceof Date
                ? r.createdAt.toISOString()
                : String(r.createdAt),
            amount: Number(r.amount),
            description: r.description ?? null,
            type: r.type ?? null,
        }));
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map