import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type AppRole = 'ADMIN_FISCAL' | 'AGENT_FISCAL' | 'ENTREPRISE';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
