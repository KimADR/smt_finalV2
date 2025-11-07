import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from './roles.decorator';
import type { Request } from 'express';
import type { AuthUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      // If no roles specified, allow any authenticated user
      return true;
    }

    if (!user.role) {
      throw new ForbiddenException('No role assigned');
    }

    // user.role may be a broader string type; cast to AppRole for comparison
    return requiredRoles.includes(user.role as AppRole);
  }
}
