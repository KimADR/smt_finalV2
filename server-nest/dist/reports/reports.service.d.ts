import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
export type ReportRow = {
    id: number;
    entrepriseId: number;
    entrepriseName?: string;
    entrepriseNif?: string | null;
    date: string;
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
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private parseDate;
    private parsePositiveInt;
    list(filters: ListFilters, user?: AuthUser): Promise<{
        rows: ReportRow[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    listAll(filters: ListFilters & {
        limit?: number;
    }, user?: AuthUser): Promise<{
        id: number;
        entrepriseId: number;
        entrepriseName: string;
        entrepriseNif: string;
        date: string;
        amount: number;
        description: string | null;
        type: import("@prisma/client").$Enums.MouvementType;
    }[]>;
}
export {};
