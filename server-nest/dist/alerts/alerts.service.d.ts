import { PrismaService } from '../prisma.service';
import type { Mouvement, Alert } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
export declare class AlertsService {
    private prisma;
    private gateway;
    constructor(prisma: PrismaService, gateway: NotificationsGateway);
    createForMouvement(m: Mouvement): Promise<Alert>;
    notifyOnAlert(alert: Alert): Promise<void>;
    getAlertsForUser(user: unknown, period?: string, entrepriseId?: number): Promise<{
        id: number;
        type: string;
        enterprise: string;
        dueDate: string;
        amount: number;
        mouvement: {
            id: number;
            type: import("@prisma/client").$Enums.MouvementType;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            estPaiementImpot: boolean;
            createdAt: string | Date;
            date_mouvement: string | null;
            entreprise: {
                id: number | null;
                name: string | null;
                siret: string | null;
            } | null;
        } | null;
        movementDescription: string | null;
        movementEntrepriseName: string | null | undefined;
        movementEntrepriseNif: string | null;
        priority: string;
        status: string;
        niveau: "simple" | "urgent" | "warning" | null;
        monthsSinceCreated: number;
        raw: {
            entreprise: {
                description: string | null;
                name: string;
                id: number;
                createdAt: Date;
                status: import("@prisma/client").$Enums.EnterpriseStatus;
                phone: string | null;
                sector: string | null;
                siret: string | null;
                address: string | null;
                contactEmail: string | null;
                taxType: import("@prisma/client").$Enums.TaxType;
                legalForm: string | null;
                activity: string | null;
                annualRevenue: number | null;
                city: string | null;
                postalCode: string | null;
            };
            mouvement: ({
                entreprise: {
                    description: string | null;
                    name: string;
                    id: number;
                    createdAt: Date;
                    status: import("@prisma/client").$Enums.EnterpriseStatus;
                    phone: string | null;
                    sector: string | null;
                    siret: string | null;
                    address: string | null;
                    contactEmail: string | null;
                    taxType: import("@prisma/client").$Enums.TaxType;
                    legalForm: string | null;
                    activity: string | null;
                    annualRevenue: number | null;
                    city: string | null;
                    postalCode: string | null;
                };
            } & {
                description: string | null;
                id: number;
                entrepriseId: number;
                userId: number | null;
                amount: import("@prisma/client/runtime/library").Decimal;
                type: import("@prisma/client").$Enums.MouvementType;
                reference: string | null;
                estPaiementImpot: boolean;
                attachments: import("@prisma/client/runtime/library").JsonValue | null;
                createdAt: Date;
            }) | null;
        } & {
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
        };
    }[]>;
    resolveAlert(alertId: number): Promise<{
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
    }>;
    deleteAlert(alertId: number): Promise<{
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
    }>;
}
