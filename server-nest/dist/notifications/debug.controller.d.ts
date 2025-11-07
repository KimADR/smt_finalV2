import { PrismaService } from '../prisma.service';
export declare class DebugNotificationsController {
    private prisma;
    constructor(prisma: PrismaService);
    all(): Promise<({
        user: {
            id: number;
            entrepriseId: number | null;
            createdAt: Date;
            updatedAt: Date;
            username: string;
            email: string;
            password: string;
            fullName: string | null;
            phone: string | null;
            avatar: string | null;
            role: import("@prisma/client").$Enums.Role;
            taxId: string | null;
            isActive: boolean;
        };
        alert: {
            id: number;
            entrepriseId: number;
            type: string;
            createdAt: Date;
            level: string;
            status: string;
            mouvementId: number | null;
            updatedAt: Date;
            resolvedAt: Date | null;
            notifiedAt: Date | null;
            notes: string | null;
        } | null;
    } & {
        id: number;
        userId: number;
        createdAt: Date;
        alertId: number | null;
        payload: import("@prisma/client/runtime/library").JsonValue;
        read: boolean;
        deleted: boolean;
        deletedAt: Date | null;
    })[]>;
}
