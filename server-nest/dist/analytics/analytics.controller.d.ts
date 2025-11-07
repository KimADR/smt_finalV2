import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly service;
    constructor(service: AnalyticsService);
    summary(period?: string, entrepriseId?: string, req?: Request & {
        user?: AuthUser;
    }): Promise<{
        entreprises: number;
        revenusTotal: number;
        depensesTotal: number;
        soldeNet: number;
        growthPercent: number;
        depensesGrowthPercent: number;
        taxesDue: number;
    }>;
    monthly(months?: string, period?: string, entrepriseId?: string, req?: Request & {
        user?: AuthUser;
    }): Promise<{
        month: string;
        revenus: number;
        depenses: number;
    }[]>;
    sector(req?: Request & {
        user?: AuthUser;
    }): Promise<{
        sector: string;
        revenus: number;
    }[]>;
    taxCompliance(req?: Request & {
        user?: AuthUser;
    }): Promise<{
        name: string;
        statut: string;
    }[]>;
    cashflow(weeks?: string, entrepriseId?: string, req?: Request & {
        user?: AuthUser;
    }): Promise<{
        week: string;
        total: number;
    }[]>;
    topEnterprises(entrepriseId?: string, req?: Request & {
        user?: AuthUser;
    }): Promise<{
        name: string;
        revenus: number;
    }[] | {
        name: string;
        revenus: string;
    }[]>;
    alerts(period?: string, entrepriseId?: string, req?: Request & {
        user?: AuthUser;
    }): Promise<{
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
