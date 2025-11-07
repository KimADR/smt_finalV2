import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import type { Prisma } from '@prisma/client';
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
    entreprise: {
        id: number;
        name: string;
    } | null;
    entrepriseNif?: string | null;
};
export declare class MouvementsService {
    private readonly prisma;
    private readonly alertsService;
    constructor(prisma: PrismaService, alertsService: AlertsService);
    private normalizeAmount;
    private validateId;
    list(user?: AuthUser, period?: string, entrepriseId?: number): Promise<MouvementListItem[]>;
    stats(user?: AuthUser, period?: string, entrepriseId?: number): Promise<{
        totalRecettes: number;
        totalDepenses: number;
        totalDepensesImpots: number;
        totalDepensesNormales: number;
        soldeNet: number;
    }>;
    getById(id: number, user?: AuthUser): Promise<MouvementListItem>;
    createFromBody(body: Record<string, unknown>, user?: AuthUser): Promise<MouvementListItem>;
    createFromMultipart(rawBody: Record<string, unknown>, files: Express.Multer.File[], user?: AuthUser): Promise<MouvementListItem>;
    update(id: number, body?: Record<string, unknown>, user?: AuthUser): Promise<MouvementListItem>;
    remove(id: number, user?: AuthUser): Promise<{
        id: number;
    }>;
    updateFromMultipart(id: number, rawBody: Record<string, unknown>, files: Express.Multer.File[], user?: AuthUser): Promise<MouvementListItem>;
}
export {};
