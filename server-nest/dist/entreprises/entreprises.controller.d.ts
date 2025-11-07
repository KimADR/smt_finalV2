import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { EntreprisesService } from './entreprises.service';
import { CreateEntrepriseDto, UpdateEntrepriseDto } from './dto/create-entreprise.dto';
export declare class EntreprisesController {
    private readonly service;
    constructor(service: EntreprisesService);
    findAll(req?: Request & {
        user?: AuthUser;
    }): never[] | import("@prisma/client").Prisma.PrismaPromise<{
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
    }[]>;
    create(dto: CreateEntrepriseDto): Promise<{
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
    }>;
    findOne(req: Request & {
        user?: AuthUser;
    }, id: string): Promise<{
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
    }>;
    update(id: string, dto: UpdateEntrepriseDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
