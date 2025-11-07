import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(body: {
        username: string;
        password: string;
    }): Promise<{
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
