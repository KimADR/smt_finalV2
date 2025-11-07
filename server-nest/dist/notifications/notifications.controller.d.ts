import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import type { AuthUser } from '../auth/auth.types';
import type { Prisma } from '@prisma/client';
export declare class NotificationsController {
    private prisma;
    constructor(prisma: PrismaService);
    list(req?: Request & {
        user?: AuthUser;
    }): Promise<{
        id: number;
        userId: number;
        alertId: number | null;
        payload: {
            alert: any;
            dueDate: string;
            movementDescription: any;
            movementEntrepriseName: any;
            movementEntrepriseNif: any;
        };
        read: boolean;
        deleted: any;
        deletedAt: any;
        createdAt: Date;
    }[]>;
    markRead(id: string, req?: Request & {
        user?: AuthUser;
    }): Promise<{
        id: number;
        userId: number;
        createdAt: Date;
        alertId: number | null;
        payload: Prisma.JsonValue;
        read: boolean;
        deleted: boolean;
        deletedAt: Date | null;
    }>;
    remove(id: string, req?: Request & {
        user?: AuthUser;
    }): Promise<{
        success: boolean;
        id: number;
    }>;
}
