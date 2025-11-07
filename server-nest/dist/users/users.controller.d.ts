import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
export declare class UsersController {
    private readonly service;
    constructor(service: UsersService);
    list(entrepriseId?: string, req?: Request & {
        user?: AuthUser;
    }): never[] | import("@prisma/client").Prisma.PrismaPromise<{
        entreprise: {
            name: string;
            id: number;
        } | null;
        id: number;
        entrepriseId: number | null;
        createdAt: Date;
        username: string;
        email: string;
        fullName: string | null;
        phone: string | null;
        avatar: string | null;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
    }[]>;
    create(dto: CreateUserDto): Promise<{
        id: number;
        createdAt: Date;
        username: string;
        email: string;
        fullName: string | null;
        phone: string | null;
        avatar: string | null;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    get(id: string): Promise<{
        entreprise: {
            name: string;
            id: number;
        } | null;
        id: number;
        entrepriseId: number | null;
        createdAt: Date;
        username: string;
        email: string;
        fullName: string | null;
        phone: string | null;
        avatar: string | null;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
        id: number;
        createdAt: Date;
        username: string;
        email: string;
        fullName: string | null;
        phone: string | null;
        avatar: string | null;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
