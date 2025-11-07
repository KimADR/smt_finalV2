export declare const ROLES_KEY = "roles";
export type AppRole = 'ADMIN_FISCAL' | 'AGENT_FISCAL' | 'ENTREPRISE';
export declare const Roles: (...roles: AppRole[]) => import("@nestjs/common").CustomDecorator<string>;
