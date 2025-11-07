import { PrismaService } from '../prisma.service';
import type { AuthUser } from '../auth/auth.types';
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private normalizeAmount;
    summary(period?: string, user?: AuthUser, entrepriseId?: number): Promise<{
        entreprises: number;
        revenusTotal: number;
        depensesTotal: number;
        soldeNet: number;
        growthPercent: number;
        depensesGrowthPercent: number;
        taxesDue: number;
    }>;
    monthly(months?: number, user?: AuthUser, period?: string, entrepriseId?: number): Promise<Array<{
        month: string;
        revenus: number;
        depenses: number;
    }>>;
    sector(user?: AuthUser): Promise<{
        sector: string;
        revenus: number;
    }[]>;
    taxCompliance(user?: AuthUser): Promise<{
        name: string;
        statut: string;
    }[]>;
    cashflow(weeks?: number, user?: AuthUser, entrepriseId?: number): Promise<{
        week: string;
        total: number;
    }[]>;
    topEnterprises(user?: AuthUser, entrepriseId?: number): Promise<{
        name: string;
        revenus: number;
    }[] | {
        name: string;
        revenus: string;
    }[]>;
    alerts(period?: string, user?: AuthUser, entrepriseId?: number): Promise<{
        id: string;
        type: string;
        enterprise: string;
        dueDate: Date;
        amount: number;
        priority: string;
        status: string;
        monthsSinceCreated: number;
    }[]>;
}
