export type Role = 'ADMIN_FISCAL' | 'AGENT_FISCAL' | 'ENTREPRISE' | (string & {});
export interface AuthUser {
    id: number;
    email?: string;
    role: Role;
    entrepriseId?: number | null;
    entreprise?: {
        id: number;
    } | null;
    [k: string]: any;
}
export default AuthUser;
