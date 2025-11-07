import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
export declare class AuthService {
    private readonly jwt;
    private readonly prisma;
    constructor(jwt: JwtService, prisma: PrismaService);
    validateUser(usernameOrEmail: string, password: string): Promise<{
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
    }>;
    login(usernameOrEmail: string, password: string): Promise<{
        access_token: string;
        user: {
            id: number;
            username: string;
            email: string;
            fullName: string | null;
            avatar: string | null;
            role: import("@prisma/client").$Enums.Role;
            entrepriseId: number | null;
        };
    }>;
}
