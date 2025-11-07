import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service';
type JwtPayload = {
    sub: number;
    username: string;
    role: 'ADMIN_FISCAL' | 'AGENT_FISCAL' | 'ENTREPRISE';
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: number;
        username: string;
        role: "ADMIN_FISCAL" | "ENTREPRISE" | "AGENT_FISCAL";
        entrepriseId?: undefined;
    } | {
        id: number;
        username: string;
        role: import("@prisma/client").$Enums.Role;
        entrepriseId: number | null;
    }>;
}
export {};
