export declare enum RoleDto {
    ADMIN_FISCAL = "ADMIN_FISCAL",
    ENTREPRISE = "ENTREPRISE",
    AGENT_FISCAL = "AGENT_FISCAL"
}
export declare class CreateUserDto {
    username: string;
    email: string;
    password: string;
    role?: RoleDto;
    fullName?: string;
    phone?: string;
    avatar?: string;
}
export declare class UpdateUserDto {
    username?: string;
    email?: string;
    password?: string;
    role?: RoleDto;
    fullName?: string;
    phone?: string;
    avatar?: string;
    entrepriseId?: number | null;
}
