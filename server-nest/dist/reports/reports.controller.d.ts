import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly service;
    constructor(service: ReportsService);
    list(query: Record<string, string | undefined>, req: Request & {
        user?: AuthUser;
    }): Promise<{
        rows: import("./reports.service").ReportRow[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    exportPdf(query: Record<string, string | undefined>, res: Response, req: Request & {
        user?: AuthUser;
    }): Promise<void>;
}
