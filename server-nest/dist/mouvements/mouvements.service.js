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
exports.MouvementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const alerts_service_1 = require("../alerts/alerts.service");
let MouvementsService = class MouvementsService {
    prisma;
    alertsService;
    constructor(prisma, alertsService) {
        this.prisma = prisma;
        this.alertsService = alertsService;
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
    validateId(id) {
        if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0)
            throw new common_1.BadRequestException('id invalide');
        if (id > 2147483647 || id < -2147483648)
            throw new common_1.BadRequestException('id hors plage valide');
    }
    async list(user, period, entrepriseId) {
        const where = {};
        if (user) {
            const urole = String(user.role ?? '').toUpperCase();
            const uEntId = user.entrepriseId ?? user.entreprise?.id ?? null;
            if (urole === 'ENTREPRISE') {
                if (uEntId)
                    where.entrepriseId = Number(uEntId);
                else
                    return [];
            }
            else if (typeof entrepriseId === 'number' && entrepriseId) {
                where.entrepriseId = entrepriseId;
            }
        }
        else if (typeof entrepriseId === 'number' && entrepriseId) {
            where.entrepriseId = entrepriseId;
        }
        if (period) {
            const now = new Date();
            let start;
            const p = String(period).toLowerCase();
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
            if (start)
                where.createdAt = { gte: start };
        }
        const rows = await this.prisma.mouvement.findMany({
            where,
            select: {
                id: true,
                amount: true,
                type: true,
                description: true,
                reference: true,
                estPaiementImpot: true,
                attachments: true,
                createdAt: true,
                entrepriseId: true,
                userId: true,
                entreprise: {
                    select: {
                        id: true,
                        name: true,
                        siret: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows.map((r) => ({
            id: Number(r.id),
            amount: String(r.amount),
            type: r.type === 'CREDIT'
                ? 'CREDIT'
                : r.type === 'TAXPAIMENT'
                    ? 'TAXPAIMENT'
                    : 'DEBIT',
            description: r.description,
            reference: r.reference,
            estPaiementImpot: r.estPaiementImpot,
            attachments: r.attachments,
            createdAt: r.createdAt instanceof Date
                ? r.createdAt.toISOString()
                : String(r.createdAt),
            entrepriseId: Number(r.entrepriseId),
            userId: r.userId === null ? null : Number(r.userId),
            entreprise: r.entreprise
                ? { id: Number(r.entreprise.id), name: r.entreprise.name }
                : null,
            entrepriseNif: r.entreprise?.siret ?? null,
        }));
    }
    async stats(user, period, entrepriseId) {
        const where = {};
        if (user) {
            const urole = String(user.role ?? '').toUpperCase();
            const uEntId = user.entrepriseId ?? user.entreprise?.id ?? null;
            if (urole === 'ENTREPRISE') {
                if (uEntId)
                    where.entrepriseId = Number(uEntId);
                else
                    return {
                        totalRecettes: 0,
                        totalDepenses: 0,
                        totalDepensesImpots: 0,
                        totalDepensesNormales: 0,
                        soldeNet: 0,
                    };
            }
            else if (typeof entrepriseId === 'number' && entrepriseId) {
                where.entrepriseId = entrepriseId;
            }
        }
        else if (typeof entrepriseId === 'number' && entrepriseId) {
            where.entrepriseId = entrepriseId;
        }
        if (period) {
            const now = new Date();
            let start;
            const p = String(period).toLowerCase();
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
            if (start)
                where.createdAt = { gte: start };
        }
        const credits = await this.prisma.mouvement.aggregate({
            where: { ...where, type: 'CREDIT' },
            _sum: { amount: true },
        });
        const debits = await this.prisma.mouvement.aggregate({
            where: { ...where, type: { in: ['DEBIT', 'TAXPAIMENT'] } },
            _sum: { amount: true },
        });
        const impots = await this.prisma.mouvement.aggregate({
            where: {
                ...where,
                OR: [{ estPaiementImpot: true }, { type: 'TAXPAIMENT' }],
            },
            _sum: { amount: true },
        });
        const sumCredits = this.normalizeAmount(credits._sum.amount);
        const sumDebits = this.normalizeAmount(debits._sum.amount);
        const sumImpots = this.normalizeAmount(impots._sum.amount);
        const totalRecettes = Number(sumCredits.toFixed(2));
        const totalDepenses = Number(Math.abs(sumDebits).toFixed(2));
        const totalDepensesImpots = Number(Math.abs(sumImpots).toFixed(2));
        const totalDepensesNormales = Number(Math.max(0, totalDepenses - totalDepensesImpots).toFixed(2));
        const soldeNet = Number((totalRecettes - totalDepenses).toFixed(2));
        return {
            totalRecettes,
            totalDepenses,
            totalDepensesImpots,
            totalDepensesNormales,
            soldeNet,
        };
    }
    async getById(id, user) {
        this.validateId(id);
        const r = await this.prisma.mouvement.findUnique({
            where: { id },
            include: {
                entreprise: {
                    select: {
                        id: true,
                        name: true,
                        siret: true,
                    },
                },
            },
        });
        if (!r)
            throw new common_1.NotFoundException('Mouvement introuvable');
        if (user) {
            const urole = String(user.role ?? '').toUpperCase();
            const entIdNum = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
            if (urole === 'ENTREPRISE') {
                if (!entIdNum || Number(r.entrepriseId) !== entIdNum) {
                    throw new common_1.ForbiddenException('Accès refusé');
                }
            }
        }
        return {
            id: Number(r.id),
            amount: String(r.amount),
            type: r.type === 'CREDIT'
                ? 'CREDIT'
                : r.type === 'TAXPAIMENT'
                    ? 'TAXPAIMENT'
                    : 'DEBIT',
            description: r.description,
            reference: r.reference,
            estPaiementImpot: r.estPaiementImpot,
            attachments: r.attachments,
            createdAt: r.createdAt instanceof Date
                ? r.createdAt.toISOString()
                : String(r.createdAt),
            entrepriseId: Number(r.entrepriseId),
            userId: r.userId === null ? null : Number(r.userId),
            entreprise: r.entreprise
                ? { id: Number(r.entreprise.id), name: r.entreprise.name }
                : null,
            entrepriseNif: r.entreprise?.siret ?? null,
        };
    }
    async createFromBody(body, user) {
        const entrepriseId = Number(body['entrepriseId'] ?? body['entreprise_id']);
        if (!entrepriseId)
            throw new common_1.BadRequestException('entrepriseId requis');
        const exists = await this.prisma.entreprise.findUnique({
            where: { id: entrepriseId },
        });
        if (!exists)
            throw new common_1.NotFoundException('Entreprise introuvable');
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
            if (!entId || entId !== entrepriseId) {
                throw new common_1.ForbiddenException('Accès refusé');
            }
        }
        const rawType = typeof body['type'] === 'string' ? body['type'] : '';
        const typeStr = rawType === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : rawType === 'RECETTE' || rawType === 'CREDIT'
                ? 'CREDIT'
                : 'DEBIT';
        const amountRaw = body['montant'] ?? body['amount'];
        const amountNum = Number(amountRaw);
        if (Number.isNaN(amountNum) || amountNum <= 0)
            throw new common_1.BadRequestException('amount must be a positive number');
        const amountSigned = typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
        const amountToStore = String(Number(amountSigned).toFixed(2));
        const description = typeof body['description'] === 'string' ? body['description'] : null;
        const reference = typeof body['reference'] === 'string' ? body['reference'] : null;
        const estPaiementImpot = !!(body['est_paiement_impot'] ?? body['estPaiementImpot']);
        const created = await this.prisma.mouvement.create({
            data: {
                entrepriseId,
                amount: amountToStore,
                type: typeStr,
                description: description ?? undefined,
                estPaiementImpot: estPaiementImpot ?? undefined,
                reference: reference ?? undefined,
            },
            include: {
                entreprise: {
                    select: {
                        id: true,
                        name: true,
                        siret: true,
                    },
                },
            },
        });
        try {
            this.alertsService
                .createForMouvement(created)
                .catch((e) => console.error('[alerts] create failed', e));
        }
        catch (e) {
            console.error('[alerts] invocation failed', e);
        }
        return {
            id: Number(created.id),
            amount: String(created.amount),
            type: created.type === 'CREDIT'
                ? 'CREDIT'
                : created.type === 'TAXPAIMENT'
                    ? 'TAXPAIMENT'
                    : 'DEBIT',
            description: created.description,
            reference: created.reference,
            estPaiementImpot: created.estPaiementImpot,
            attachments: created.attachments,
            createdAt: created.createdAt instanceof Date
                ? created.createdAt.toISOString()
                : String(created.createdAt),
            entrepriseId: Number(created.entrepriseId),
            userId: created.userId === null ? null : Number(created.userId),
            entreprise: created.entreprise
                ? { id: Number(created.entreprise.id), name: created.entreprise.name }
                : null,
            entrepriseNif: created.entreprise?.siret ?? null,
        };
    }
    async createFromMultipart(rawBody, files, user) {
        if (!files || files.length === 0)
            throw new common_1.BadRequestException('Au moins une pièce justificative est requise');
        let payload = {};
        if (typeof rawBody?.payload === 'string') {
            try {
                payload = JSON.parse(String(rawBody.payload));
            }
            catch {
                payload = rawBody;
            }
        }
        else {
            payload = rawBody;
        }
        const entrepriseId = Number(payload['entreprise_id'] ??
            payload['entrepriseId'] ??
            rawBody['entreprise_id'] ??
            rawBody['entrepriseId']);
        if (!entrepriseId)
            throw new common_1.BadRequestException('entrepriseId requis');
        const exists = await this.prisma.entreprise.findUnique({
            where: { id: entrepriseId },
        });
        if (!exists)
            throw new common_1.NotFoundException('Entreprise introuvable');
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
            if (!entId || entId !== entrepriseId) {
                throw new common_1.ForbiddenException('Accès refusé');
            }
        }
        const typeRaw = typeof payload['type'] === 'string' ? payload['type'] : '';
        const typeStr = typeRaw === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : typeRaw === 'RECETTE' || typeRaw === 'CREDIT'
                ? 'CREDIT'
                : 'DEBIT';
        const amountNum = Number(payload['montant'] ?? payload['amount']);
        if (Number.isNaN(amountNum) || amountNum <= 0)
            throw new common_1.BadRequestException('amount must be a positive number');
        const amountSigned = typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
        const amountToStore = String(Number(amountSigned).toFixed(2));
        const attachmentsMeta = files.map((f) => {
            if (!f || !f.buffer)
                throw new common_1.BadRequestException('Fichier invalide ou corrompu');
            const buffer = f.buffer;
            const mime = f.mimetype ?? 'application/octet-stream';
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${mime};base64,${base64}`;
            return {
                filename: f.originalname,
                mimeType: mime,
                data: dataUrl,
            };
        });
        const description = typeof payload['description'] === 'string'
            ? payload['description']
            : null;
        const reference = typeof payload['reference'] === 'string' ? payload['reference'] : null;
        const estPaiementImpot = !!payload['est_paiement_impot'];
        try {
            const created = await this.prisma.mouvement.create({
                data: {
                    entrepriseId,
                    amount: amountToStore,
                    type: typeStr,
                    description: description ?? undefined,
                    reference: reference ?? undefined,
                    estPaiementImpot: estPaiementImpot ?? undefined,
                    attachments: attachmentsMeta,
                },
            });
            const createdRow = created;
            try {
                this.alertsService
                    .createForMouvement(created)
                    .catch((e) => console.error('[alerts] create failed', e));
            }
            catch (e) {
                console.error('[alerts] invocation failed', e);
            }
            return {
                id: Number(createdRow.id),
                amount: String(createdRow.amount),
                type: createdRow.type === 'CREDIT'
                    ? 'CREDIT'
                    : createdRow.type === 'TAXPAIMENT'
                        ? 'TAXPAIMENT'
                        : 'DEBIT',
                description: createdRow.description,
                reference: createdRow.reference,
                estPaiementImpot: createdRow.estPaiementImpot,
                attachments: createdRow.attachments,
                createdAt: createdRow.createdAt instanceof Date
                    ? createdRow.createdAt.toISOString()
                    : String(createdRow.createdAt),
                entrepriseId: Number(createdRow.entrepriseId),
                userId: createdRow.userId === null ? null : Number(createdRow.userId),
                entreprise: createdRow.entreprise
                    ? {
                        id: Number(createdRow.entreprise.id),
                        name: createdRow.entreprise.name,
                    }
                    : null,
            };
        }
        catch (err) {
            const e = err;
            console.error('[mouvements.createFromMultipart] prisma create failed', e.stack ?? e.message ?? String(err));
            console.error('[mouvements.createFromMultipart] payload sample:', {
                entrepriseId,
                typeStr,
                amountNum,
                description: String(description).slice(0, 200),
            });
            console.error('[mouvements.createFromMultipart] files sample:', files.map((f) => ({
                name: f.originalname,
                size: f.size,
                mimetype: f.mimetype,
            })));
            const message = e?.message ?? String(err);
            throw new common_1.BadRequestException(message);
        }
    }
    async update(id, body = {}, user) {
        this.validateId(id);
        const exists = await this.prisma.mouvement.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Mouvement introuvable');
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
            if (!entId || Number(exists.entrepriseId) !== entId) {
                throw new common_1.ForbiddenException('Accès refusé');
            }
        }
        const rawType = typeof body['type'] === 'string' ? body['type'] : '';
        const typeStr = rawType === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : rawType === 'RECETTE' || rawType === 'CREDIT'
                ? 'CREDIT'
                : 'DEBIT';
        const amountRaw = body['montant'] ?? body['amount'] ?? exists.amount;
        const amountNum = Number(amountRaw);
        if (Number.isNaN(amountNum) || amountNum <= 0)
            throw new common_1.BadRequestException('amount must be a positive number');
        const amountSigned = typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
        const amountToStore = String(Number(amountSigned).toFixed(2));
        const description = typeof body['description'] === 'string'
            ? body['description']
            : exists.description;
        const reference = typeof body['reference'] === 'string'
            ? body['reference']
            : exists.reference;
        const estPaiementImpot = !!(body['est_paiement_impot'] ??
            body['estPaiementImpot'] ??
            exists.estPaiementImpot);
        const newEntrepriseIdRaw = body['entrepriseId'] ?? body['entreprise_id'];
        let entrepriseIdToSet = undefined;
        if (typeof newEntrepriseIdRaw !== 'undefined') {
            const eid = Number(newEntrepriseIdRaw);
            if (!Number.isFinite(eid) || !Number.isInteger(eid) || eid <= 0)
                throw new common_1.BadRequestException('entrepriseId invalide');
            const entExists = await this.prisma.entreprise.findUnique({
                where: { id: eid },
            });
            if (!entExists)
                throw new common_1.NotFoundException('Entreprise introuvable');
            entrepriseIdToSet = eid;
            if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
                const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
                if (!entId || entId !== eid) {
                    throw new common_1.ForbiddenException('Accès refusé');
                }
            }
        }
        const updated = await this.prisma.mouvement.update({
            where: { id },
            data: {
                amount: amountToStore,
                type: typeStr,
                description: description ?? undefined,
                reference: reference ?? undefined,
                estPaiementImpot: estPaiementImpot ?? undefined,
                entrepriseId: entrepriseIdToSet ?? undefined,
            },
            include: {
                entreprise: { select: { id: true, name: true, siret: true } },
            },
        });
        try {
            this.alertsService
                .createForMouvement(updated)
                .catch((e) => console.error('[alerts] update failed', e));
        }
        catch (e) {
            console.error('[alerts] invocation failed', e);
        }
        return {
            id: Number(updated.id),
            amount: String(updated.amount),
            type: updated.type === 'CREDIT'
                ? 'CREDIT'
                : updated.type === 'TAXPAIMENT'
                    ? 'TAXPAIMENT'
                    : 'DEBIT',
            description: updated.description,
            reference: updated.reference,
            estPaiementImpot: updated.estPaiementImpot,
            attachments: updated.attachments,
            createdAt: updated.createdAt instanceof Date
                ? updated.createdAt.toISOString()
                : String(updated.createdAt),
            entrepriseId: Number(updated.entrepriseId),
            userId: updated.userId === null ? null : Number(updated.userId),
            entreprise: updated.entreprise
                ? { id: Number(updated.entreprise.id), name: updated.entreprise.name }
                : null,
            entrepriseNif: updated.entreprise?.siret ?? null,
        };
    }
    async remove(id, user) {
        this.validateId(id);
        const exists = await this.prisma.mouvement.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Mouvement introuvable');
        if (user) {
            const urole = String(user.role ?? '').toUpperCase();
            const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
            if (urole === 'ENTREPRISE') {
                if (!entId || Number(exists.entrepriseId) !== entId) {
                    throw new common_1.ForbiddenException('Accès refusé');
                }
            }
        }
        try {
            const alert = await this.prisma.alert.create({
                data: {
                    type: 'MOUVEMENT_DELETED',
                    level: 'simple',
                    status: 'open',
                    entrepriseId: Number(exists.entrepriseId),
                    mouvementId: null,
                    notes: `Mouvement ${exists.id} supprimé`,
                },
            });
            await this.alertsService.notifyOnAlert(alert);
        }
        catch (e) {
            console.error('[alerts] deletion notify failed', e);
        }
        await this.prisma.mouvement.delete({ where: { id } });
        return { id };
    }
    async updateFromMultipart(id, rawBody, files, user) {
        this.validateId(id);
        let payload = {};
        if (typeof rawBody?.payload === 'string') {
            try {
                payload = JSON.parse(String(rawBody.payload));
            }
            catch {
                payload = Object.assign({}, rawBody);
            }
        }
        else {
            payload = rawBody;
        }
        const exists = await this.prisma.mouvement.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Mouvement introuvable');
        if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
            const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
            if (!entId || Number(exists.entrepriseId) !== entId) {
                throw new common_1.ForbiddenException('Accès refusé');
            }
        }
        const rawType = typeof payload['type'] === 'string' ? payload['type'] : '';
        const typeStr = rawType === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : rawType === 'RECETTE' || rawType === 'CREDIT'
                ? 'CREDIT'
                : 'DEBIT';
        const amountRaw = payload['montant'] ?? payload['amount'] ?? exists.amount;
        const amountNum = Number(amountRaw);
        if (Number.isNaN(amountNum) || amountNum <= 0)
            throw new common_1.BadRequestException('amount must be a positive number');
        const amountSigned = typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
        const amountToStore = String(Number(amountSigned).toFixed(2));
        const attachmentsMeta = files.map((f) => {
            if (!f || !f.buffer)
                throw new common_1.BadRequestException('Fichier invalide ou corrompu');
            const buffer = f.buffer;
            const mime = f.mimetype ?? 'application/octet-stream';
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${mime};base64,${base64}`;
            return {
                filename: f.originalname,
                mimeType: mime,
                data: dataUrl,
            };
        });
        const description = typeof payload['description'] === 'string'
            ? payload['description']
            : exists.description;
        const reference = typeof payload['reference'] === 'string'
            ? payload['reference']
            : exists.reference;
        const estPaiementImpot = !!(payload['est_paiement_impot'] ??
            payload['estPaiementImpot'] ??
            exists.estPaiementImpot);
        const newEntrepriseIdRaw = payload['entrepriseId'] ??
            payload['entreprise_id'] ??
            rawBody['entrepriseId'] ??
            rawBody['entreprise_id'];
        let entrepriseIdToSet = undefined;
        if (typeof newEntrepriseIdRaw !== 'undefined') {
            const eid = Number(newEntrepriseIdRaw);
            if (!Number.isFinite(eid) || !Number.isInteger(eid) || eid <= 0)
                throw new common_1.BadRequestException('entrepriseId invalide');
            const entExists = await this.prisma.entreprise.findUnique({
                where: { id: eid },
            });
            if (!entExists)
                throw new common_1.NotFoundException('Entreprise introuvable');
            entrepriseIdToSet = eid;
            if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
                const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
                if (!entId || entId !== eid) {
                    throw new common_1.ForbiddenException('Accès refusé');
                }
            }
        }
        const updated = await this.prisma.mouvement.update({
            where: { id },
            data: {
                amount: amountToStore,
                type: typeStr,
                description: description ?? undefined,
                reference: reference ?? undefined,
                estPaiementImpot: estPaiementImpot ?? undefined,
                attachments: attachmentsMeta,
                entrepriseId: entrepriseIdToSet ?? undefined,
            },
            include: {
                entreprise: { select: { id: true, name: true, siret: true } },
            },
        });
        try {
            this.alertsService
                .createForMouvement(updated)
                .catch((e) => console.error('[alerts] update (multipart) failed', e));
        }
        catch (e) {
            console.error('[alerts] invocation failed', e);
        }
        return {
            id: Number(updated.id),
            amount: String(updated.amount),
            type: updated.type === 'CREDIT'
                ? 'CREDIT'
                : updated.type === 'TAXPAIMENT'
                    ? 'TAXPAIMENT'
                    : 'DEBIT',
            description: updated.description,
            reference: updated.reference,
            estPaiementImpot: updated.estPaiementImpot,
            attachments: updated.attachments,
            createdAt: updated.createdAt instanceof Date
                ? updated.createdAt.toISOString()
                : String(updated.createdAt),
            entrepriseId: Number(updated.entrepriseId),
            userId: updated.userId === null ? null : Number(updated.userId),
            entreprise: updated.entreprise
                ? { id: Number(updated.entreprise.id), name: updated.entreprise.name }
                : null,
            entrepriseNif: updated.entreprise?.siret ?? null,
        };
    }
};
exports.MouvementsService = MouvementsService;
exports.MouvementsService = MouvementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        alerts_service_1.AlertsService])
], MouvementsService);
//# sourceMappingURL=mouvements.service.js.map