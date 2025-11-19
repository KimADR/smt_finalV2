import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import type { Prisma, Mouvement } from '@prisma/client';

type MouvementType = 'CREDIT' | 'DEBIT' | 'TAXPAIMENT';

type MouvementListItem = {
  id: number;
  amount: string;
  type: MouvementType;
  description: string | null;
  reference: string | null;
  estPaiementImpot: boolean | null;
  attachments: Prisma.InputJsonValue | null;
  createdAt: string;
  entrepriseId: number;
  userId: number | null;
  entreprise: { id: number; name: string } | null;
  entrepriseNif?: string | null;
};

@Injectable()
export class MouvementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  private normalizeAmount(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number(Number(value).toFixed(2));
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isNaN(n) ? 0 : Number(n.toFixed(2));
    }
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

  // Validate id is a safe 32-bit integer for the DB
  private validateId(id: number) {
    if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0)
      throw new BadRequestException('id invalide');
    // 32-bit signed int range
    if (id > 2147483647 || id < -2147483648)
      throw new BadRequestException('id hors plage valide');
  }

  async list(
    user?: AuthUser,
    period?: string,
    entrepriseId?: number,
  ): Promise<MouvementListItem[]> {
    const where: Prisma.MouvementWhereInput = {};
    if (user) {
      const urole = String(user.role ?? '').toUpperCase();
      const uEntId = user.entrepriseId ?? user.entreprise?.id ?? null;
      if (urole === 'ENTREPRISE') {
        if (uEntId) where.entrepriseId = Number(uEntId);
        else return [];
      } else if (typeof entrepriseId === 'number' && entrepriseId) {
        // admins can filter by entrepriseId explicitly
        where.entrepriseId = entrepriseId;
      }
    } else if (typeof entrepriseId === 'number' && entrepriseId) {
      // public/no-user call but explicit entrepriseId provided
      where.entrepriseId = entrepriseId;
    }

    // Filtrage par période
    if (period) {
      const now = new Date();
      let start: Date | undefined;
      const p = String(period).toLowerCase();
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
      if (start) where.createdAt = { gte: start };
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
      type:
        r.type === 'CREDIT'
          ? 'CREDIT'
          : r.type === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : 'DEBIT',
      description: r.description,
      reference: r.reference,
      estPaiementImpot: r.estPaiementImpot,
      attachments: r.attachments as Prisma.InputJsonValue | null,
      createdAt:
        r.createdAt instanceof Date
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

  /**
   * Compute aggregated statistics for mouvements (recettes, dépenses, impôts, solde)
   * Applies the same entreprise / period access rules as `list`.
   */
  async stats(
    user?: AuthUser,
    period?: string,
    entrepriseId?: number,
  ): Promise<{
    totalRecettes: number;
    totalDepenses: number; // absolute value
    totalDepensesImpots: number; // absolute value
    totalDepensesNormales: number; // absolute value
    soldeNet: number;
  }> {
    const where: Prisma.MouvementWhereInput = {};
    if (user) {
      const urole = String(user.role ?? '').toUpperCase();
      const uEntId = user.entrepriseId ?? user.entreprise?.id ?? null;
      if (urole === 'ENTREPRISE') {
        if (uEntId) where.entrepriseId = Number(uEntId);
        else
          return {
            totalRecettes: 0,
            totalDepenses: 0,
            totalDepensesImpots: 0,
            totalDepensesNormales: 0,
            soldeNet: 0,
          };
      } else if (typeof entrepriseId === 'number' && entrepriseId) {
        where.entrepriseId = entrepriseId;
      }
    } else if (typeof entrepriseId === 'number' && entrepriseId) {
      where.entrepriseId = entrepriseId;
    }

    // period -> createdAt filter (same logic as list)
    if (period) {
      const now = new Date();
      let start: Date | undefined;
      const p = String(period).toLowerCase();
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
      if (start) where.createdAt = { gte: start };
    }

    // Sum credits
    const credits = await this.prisma.mouvement.aggregate({
      where: { ...where, type: 'CREDIT' },
      _sum: { amount: true },
    });

    // Sum debits (including TAXPAIMENT)
    const debits = await this.prisma.mouvement.aggregate({
      where: { ...where, type: { in: ['DEBIT', 'TAXPAIMENT'] } },
      _sum: { amount: true },
    });

    // Sum impots: either marked estPaiementImpot or type === 'TAXPAIMENT'
    const impots = await this.prisma.mouvement.aggregate({
      where: {
        ...where,
        OR: [{ estPaiementImpot: true }, { type: 'TAXPAIMENT' }],
      },
      _sum: { amount: true },
    });

    const sumCredits = this.normalizeAmount(credits._sum.amount);
    const sumDebits = this.normalizeAmount(debits._sum.amount); // may be negative or zero
    const sumImpots = this.normalizeAmount(impots._sum.amount); // may be negative or zero

    const totalRecettes = Number(sumCredits.toFixed(2));
    const totalDepenses = Number(Math.abs(sumDebits).toFixed(2));
    const totalDepensesImpots = Number(Math.abs(sumImpots).toFixed(2));
    const totalDepensesNormales = Number(
      Math.max(0, totalDepenses - totalDepensesImpots).toFixed(2),
    );

    const soldeNet = Number((totalRecettes - totalDepenses).toFixed(2));

    return {
      totalRecettes,
      totalDepenses,
      totalDepensesImpots,
      totalDepensesNormales,
      soldeNet,
    };
  }

  async getById(id: number, user?: AuthUser): Promise<MouvementListItem> {
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
    if (!r) throw new NotFoundException('Mouvement introuvable');

    // ENTREPRISE users can only view mouvements for their own entreprise
    if (user) {
      const urole = String(user.role ?? '').toUpperCase();
      const entIdNum = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
      if (urole === 'ENTREPRISE') {
        if (!entIdNum || Number(r.entrepriseId) !== entIdNum) {
          throw new ForbiddenException('Accès refusé');
        }
      }
    }

    return {
      id: Number(r.id),
      amount: String(r.amount),
      type:
        r.type === 'CREDIT'
          ? 'CREDIT'
          : r.type === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : 'DEBIT',
      description: r.description,
      reference: r.reference,
      estPaiementImpot: r.estPaiementImpot,
      attachments: r.attachments as Prisma.InputJsonValue | null,
      createdAt:
        r.createdAt instanceof Date
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

  async createFromBody(
    body: Record<string, unknown>,
    user?: AuthUser,
  ): Promise<MouvementListItem> {
    const entrepriseId = Number(body['entrepriseId'] ?? body['entreprise_id']);
    if (!entrepriseId) throw new BadRequestException('entrepriseId requis');

    const exists = await this.prisma.entreprise.findUnique({
      where: { id: entrepriseId },
    });
    if (!exists) throw new NotFoundException('Entreprise introuvable');

    // Enforce that an authenticated ENTREPRISE user can only create mouvements
    // for their own entreprise
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
      if (!entId || entId !== entrepriseId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    const rawType = typeof body['type'] === 'string' ? body['type'] : '';
    const typeStr: MouvementType =
      rawType === 'TAXPAIMENT'
        ? 'TAXPAIMENT'
        : rawType === 'RECETTE' || rawType === 'CREDIT'
          ? 'CREDIT'
          : 'DEBIT';

    const amountRaw = body['montant'] ?? body['amount'];
    const amountNum = Number(amountRaw);
    if (Number.isNaN(amountNum) || amountNum <= 0)
      throw new BadRequestException('amount must be a positive number');
    const amountSigned =
      typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
    const amountToStore = String(Number(amountSigned).toFixed(2));

    const description =
      typeof body['description'] === 'string' ? body['description'] : null;
    const reference =
      typeof body['reference'] === 'string' ? body['reference'] : null;
    const estPaiementImpot = !!(
      body['est_paiement_impot'] ?? body['estPaiementImpot']
    );

    const created = await this.prisma.mouvement.create({
      data: {
        entrepriseId,
        amount: amountToStore as unknown as Prisma.Decimal,
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

    // create alert for this mouvement
    try {
      // run asynchronously, don't block the response
      this.alertsService
        .createForMouvement(created as unknown as Mouvement)
        .catch((e) => console.error('[alerts] create failed', e));
    } catch (e) {
      console.error('[alerts] invocation failed', e);
    }

    return {
      id: Number(created.id),
      amount: String(created.amount),
      type:
        (created.type as MouvementType) === 'CREDIT'
          ? 'CREDIT'
          : (created.type as MouvementType) === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : 'DEBIT',
      description: created.description,
      reference: created.reference,
      estPaiementImpot: created.estPaiementImpot,
      attachments: created.attachments as Prisma.InputJsonValue | null,
      createdAt:
        created.createdAt instanceof Date
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

  // notify alerts for createFromBody
  // (handled by caller if needed)

  async createFromMultipart(
    rawBody: Record<string, unknown>,
    files: Express.Multer.File[],
    user?: AuthUser,
  ): Promise<MouvementListItem> {
    if (!files || files.length === 0)
      throw new BadRequestException(
        'Au moins une pièce justificative est requise',
      );

    let payload: Record<string, unknown> = {};
    if (typeof rawBody?.payload === 'string') {
      try {
        payload = JSON.parse(String(rawBody.payload)) as Record<
          string,
          unknown
        >;
      } catch {
        payload = rawBody;
      }
    } else {
      payload = rawBody;
    }

    const entrepriseId = Number(
      payload['entreprise_id'] ??
        payload['entrepriseId'] ??
        rawBody['entreprise_id'] ??
        rawBody['entrepriseId'],
    );
    if (!entrepriseId) throw new BadRequestException('entrepriseId requis');

    const exists = await this.prisma.entreprise.findUnique({
      where: { id: entrepriseId },
    });
    if (!exists) throw new NotFoundException('Entreprise introuvable');

    // Enforce entreprise ownership for ENTREPRISE role
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
      if (!entId || entId !== entrepriseId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    const typeRaw = typeof payload['type'] === 'string' ? payload['type'] : '';
    const typeStr: MouvementType =
      typeRaw === 'TAXPAIMENT'
        ? 'TAXPAIMENT'
        : typeRaw === 'RECETTE' || typeRaw === 'CREDIT'
          ? 'CREDIT'
          : 'DEBIT';

    const amountNum = Number(payload['montant'] ?? payload['amount']);
    if (Number.isNaN(amountNum) || amountNum <= 0)
      throw new BadRequestException('amount must be a positive number');
    const amountSigned =
      typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
    const amountToStore = String(Number(amountSigned).toFixed(2));

    const attachmentsMeta = files.map((f) => {
      if (!f || !f.buffer)
        throw new BadRequestException('Fichier invalide ou corrompu');
      const buffer = f.buffer;
      const mime = f.mimetype ?? 'application/octet-stream';
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      return {
        filename: f.originalname,
        mimeType: mime,
        data: dataUrl,
      } as unknown as Prisma.InputJsonValue;
    });

    const description =
      typeof payload['description'] === 'string'
        ? payload['description']
        : null;
    const reference =
      typeof payload['reference'] === 'string' ? payload['reference'] : null;
    const estPaiementImpot = !!payload['est_paiement_impot'];

    try {
      const created = await this.prisma.mouvement.create({
        data: {
          entrepriseId,
          amount: amountToStore as unknown as Prisma.Decimal,
          type: typeStr,
          description: description ?? undefined,
          reference: reference ?? undefined,
          estPaiementImpot: estPaiementImpot ?? undefined,
          attachments: attachmentsMeta as Prisma.InputJsonValue,
        },
      });

      const createdRow = created as unknown as {
        id: number;
        amount: Prisma.Decimal;
        type: MouvementType;
        description: string | null;
        reference: string | null;
        estPaiementImpot: boolean | null;
        attachments: Prisma.JsonValue | null;
        createdAt: Date;
        entrepriseId: number;
        userId: number | null;
        entreprise?: { id: number; name: string } | null;
      };

      // schedule alert creation (async)
      try {
        this.alertsService
          .createForMouvement(created as unknown as Mouvement)
          .catch((e) => console.error('[alerts] create failed', e));
      } catch (e) {
        console.error('[alerts] invocation failed', e);
      }

      return {
        id: Number(createdRow.id),
        amount: String(createdRow.amount),
        type:
          createdRow.type === 'CREDIT'
            ? 'CREDIT'
            : createdRow.type === 'TAXPAIMENT'
              ? 'TAXPAIMENT'
              : 'DEBIT',
        description: createdRow.description,
        reference: createdRow.reference,
        estPaiementImpot: createdRow.estPaiementImpot,
        attachments: createdRow.attachments as Prisma.InputJsonValue | null,
        createdAt:
          createdRow.createdAt instanceof Date
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
    } catch (err: unknown) {
      const e = err as { message?: string; stack?: string };
      console.error(
        '[mouvements.createFromMultipart] prisma create failed',
        e.stack ?? e.message ?? String(err),
      );
      console.error('[mouvements.createFromMultipart] payload sample:', {
        entrepriseId,
        typeStr,
        amountNum,
        description: String(description).slice(0, 200),
      });
      console.error(
        '[mouvements.createFromMultipart] files sample:',
        files.map((f) => ({
          name: f.originalname,
          size: f.size,
          mimetype: f.mimetype,
        })),
      );
      const message = e?.message ?? String(err);
      throw new BadRequestException(message);
    }
  }

  async update(
    id: number,
    body: Record<string, unknown> = {},
    user?: AuthUser,
  ): Promise<MouvementListItem> {
    this.validateId(id);
    const exists = await this.prisma.mouvement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Mouvement introuvable');

    // If the current user is an ENTREPRISE, they may only update mouvements
    // belonging to their own entreprise
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
      if (!entId || Number(exists.entrepriseId) !== entId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    const rawType = typeof body['type'] === 'string' ? body['type'] : '';
    const typeStr: MouvementType =
      rawType === 'TAXPAIMENT'
        ? 'TAXPAIMENT'
        : rawType === 'RECETTE' || rawType === 'CREDIT'
          ? 'CREDIT'
          : 'DEBIT';

    const amountRaw = body['montant'] ?? body['amount'] ?? exists.amount;
    const amountNum = Number(amountRaw);
    if (Number.isNaN(amountNum) || amountNum <= 0)
      throw new BadRequestException('amount must be a positive number');
    const amountSigned =
      typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
    const amountToStore = String(Number(amountSigned).toFixed(2));

    const description =
      typeof body['description'] === 'string'
        ? body['description']
        : exists.description;
    const reference =
      typeof body['reference'] === 'string'
        ? body['reference']
        : exists.reference;
    const estPaiementImpot = !!(
      body['est_paiement_impot'] ??
      body['estPaiementImpot'] ??
      exists.estPaiementImpot
    );

    // If client wants to change the entreprise for this mouvement, validate it
    const newEntrepriseIdRaw = body['entrepriseId'] ?? body['entreprise_id'];
    let entrepriseIdToSet: number | undefined = undefined;
    if (typeof newEntrepriseIdRaw !== 'undefined') {
      const eid = Number(newEntrepriseIdRaw);
      if (!Number.isFinite(eid) || !Number.isInteger(eid) || eid <= 0)
        throw new BadRequestException('entrepriseId invalide');
      const entExists = await this.prisma.entreprise.findUnique({
        where: { id: eid },
      });
      if (!entExists) throw new NotFoundException('Entreprise introuvable');
      entrepriseIdToSet = eid;

      // If an ENTREPRISE user attempts to change the entreprise, deny if it
      // does not match their own entreprise
      if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
        const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
        if (!entId || entId !== eid) {
          throw new ForbiddenException('Accès refusé');
        }
      }
    }

    const updated = await this.prisma.mouvement.update({
      where: { id },
      data: {
        amount: amountToStore as unknown as Prisma.Decimal,
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

    // schedule alert creation on update (async)
    try {
      this.alertsService
        .createForMouvement(updated as unknown as Mouvement)
        .catch((e) => console.error('[alerts] update failed', e));
    } catch (e) {
      console.error('[alerts] invocation failed', e);
    }

    return {
      id: Number(updated.id),
      amount: String(updated.amount),
      type:
        (updated.type as MouvementType) === 'CREDIT'
          ? 'CREDIT'
          : (updated.type as MouvementType) === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : 'DEBIT',
      description: updated.description,
      reference: updated.reference,
      estPaiementImpot: updated.estPaiementImpot,
      attachments: updated.attachments as Prisma.InputJsonValue | null,
      createdAt:
        updated.createdAt instanceof Date
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

  async remove(id: number, user?: AuthUser): Promise<{ id: number }> {
    this.validateId(id);
    const exists = await this.prisma.mouvement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Mouvement introuvable');

    // ENTREPRISE users can only delete mouvements for their own entreprise
    if (user) {
      const urole = String(user.role ?? '').toUpperCase();
      const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
      if (urole === 'ENTREPRISE') {
        if (!entId || Number(exists.entrepriseId) !== entId) {
          throw new ForbiddenException('Accès refusé');
        }
      }
    }

    // create alert and notifications before deletion
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
    } catch (e) {
      console.error('[alerts] deletion notify failed', e);
    }

    await this.prisma.mouvement.delete({ where: { id } });
    return { id };
  }

  // Handle multipart update (when attachments are uploaded)
  async updateFromMultipart(
    id: number,
    rawBody: Record<string, unknown>,
    files: Express.Multer.File[],
    user?: AuthUser,
  ): Promise<MouvementListItem> {
    this.validateId(id);
    // parse payload field if present
    let payload: Record<string, unknown> = {};
    if (typeof rawBody?.payload === 'string') {
      try {
        payload = JSON.parse(String(rawBody.payload)) as Record<
          string,
          unknown
        >;
      } catch {
        // fall back to a shallow copy of rawBody
        payload = Object.assign({}, rawBody);
      }
    } else {
      payload = rawBody;
    }

    const exists = await this.prisma.mouvement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Mouvement introuvable');

    // ENTREPRISE users can only update mouvements for their own entreprise
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
      if (!entId || Number(exists.entrepriseId) !== entId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    const rawType = typeof payload['type'] === 'string' ? payload['type'] : '';
    const typeStr: MouvementType =
      rawType === 'TAXPAIMENT'
        ? 'TAXPAIMENT'
        : rawType === 'RECETTE' || rawType === 'CREDIT'
          ? 'CREDIT'
          : 'DEBIT';

    const amountRaw = payload['montant'] ?? payload['amount'] ?? exists.amount;
    const amountNum = Number(amountRaw);
    if (Number.isNaN(amountNum) || amountNum <= 0)
      throw new BadRequestException('amount must be a positive number');
    const amountSigned =
      typeStr === 'DEBIT' ? -Math.abs(amountNum) : Math.abs(amountNum);
    const amountToStore = String(Number(amountSigned).toFixed(2));

    const attachmentsMeta = files.map((f) => {
      if (!f || !f.buffer)
        throw new BadRequestException('Fichier invalide ou corrompu');
      const buffer = f.buffer;
      const mime = f.mimetype ?? 'application/octet-stream';
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      return {
        filename: f.originalname,
        mimeType: mime,
        data: dataUrl,
      } as unknown as Prisma.InputJsonValue;
    });

    const description =
      typeof payload['description'] === 'string'
        ? payload['description']
        : exists.description;
    const reference =
      typeof payload['reference'] === 'string'
        ? payload['reference']
        : exists.reference;
    const estPaiementImpot = !!(
      payload['est_paiement_impot'] ??
      payload['estPaiementImpot'] ??
      exists.estPaiementImpot
    );

    // Allow changing entreprise via multipart payload
    const newEntrepriseIdRaw =
      payload['entrepriseId'] ??
      payload['entreprise_id'] ??
      rawBody['entrepriseId'] ??
      rawBody['entreprise_id'];
    let entrepriseIdToSet: number | undefined = undefined;
    if (typeof newEntrepriseIdRaw !== 'undefined') {
      const eid = Number(newEntrepriseIdRaw);
      if (!Number.isFinite(eid) || !Number.isInteger(eid) || eid <= 0)
        throw new BadRequestException('entrepriseId invalide');
      const entExists = await this.prisma.entreprise.findUnique({
        where: { id: eid },
      });
      if (!entExists) throw new NotFoundException('Entreprise introuvable');
      entrepriseIdToSet = eid;

      // Deny if ENTREPRISE user tries to set entreprise to another one
      if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
        const entId = Number(user.entrepriseId ?? user.entreprise?.id ?? null);
        if (!entId || entId !== eid) {
          throw new ForbiddenException('Accès refusé');
        }
      }
    }

    const updated = await this.prisma.mouvement.update({
      where: { id },
      data: {
        amount: amountToStore as unknown as Prisma.Decimal,
        type: typeStr,
        description: description ?? undefined,
        reference: reference ?? undefined,
        estPaiementImpot: estPaiementImpot ?? undefined,
        attachments: attachmentsMeta as Prisma.InputJsonValue,
        entrepriseId: entrepriseIdToSet ?? undefined,
      },
      include: {
        entreprise: { select: { id: true, name: true, siret: true } },
      },
    });

    // schedule alert creation on multipart update (async)
    try {
      this.alertsService
        .createForMouvement(updated as unknown as Mouvement)
        .catch((e) => console.error('[alerts] update (multipart) failed', e));
    } catch (e) {
      console.error('[alerts] invocation failed', e);
    }

    return {
      id: Number(updated.id),
      amount: String(updated.amount),
      type:
        (updated.type as MouvementType) === 'CREDIT'
          ? 'CREDIT'
          : (updated.type as MouvementType) === 'TAXPAIMENT'
            ? 'TAXPAIMENT'
            : 'DEBIT',
      description: updated.description,
      reference: updated.reference,
      estPaiementImpot: updated.estPaiementImpot,
      attachments: updated.attachments as Prisma.InputJsonValue | null,
      createdAt:
        updated.createdAt instanceof Date
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
}
