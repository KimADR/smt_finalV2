import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma.service';
import type { Prisma } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(filter?: {
        entrepriseId?: number;
    }): Prisma.PrismaPromise<{
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
    create(input: CreateUserDto): Promise<{
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
    get(id: number): Promise<{
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
    update(id: number, input: UpdateUserDto): Promise<{
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
    remove(id: number): Promise<void>;
}
