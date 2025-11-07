import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('summary')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  summary(
    @Query('period') period?: string,
    @Query('entrepriseId') entrepriseId?: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    // debug: log authenticated user to ensure entreprise scoping is available
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[analytics.summary] req.user =', req?.user);
    }
    return this.service.summary(
      period,
      req?.user,
      entrepriseId ? Number(entrepriseId) : undefined,
    );
  }

  @Get('monthly')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  monthly(
    @Query('months') months?: string,
    @Query('period') period?: string,
    @Query('entrepriseId') entrepriseId?: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    return this.service.monthly(
      Number(months || 6),
      req?.user,
      period,
      entrepriseId ? Number(entrepriseId) : undefined,
    );
  }

  @Get('sector')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  sector(@Req() req?: Request & { user?: AuthUser }) {
    return this.service.sector(req?.user);
  }

  @Get('tax-compliance')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  taxCompliance(@Req() req?: Request & { user?: AuthUser }) {
    return this.service.taxCompliance(req?.user);
  }

  @Get('cashflow')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  cashflow(
    @Query('weeks') weeks?: string,
    @Query('entrepriseId') entrepriseId?: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    return this.service.cashflow(
      Number(weeks || 4),
      req?.user,
      entrepriseId ? Number(entrepriseId) : undefined,
    );
  }

  @Get('top-enterprises')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  topEnterprises(
    @Query('entrepriseId') entrepriseId?: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    return this.service.topEnterprises(
      req?.user,
      entrepriseId ? Number(entrepriseId) : undefined,
    );
  }

  @Get('alerts')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  alerts(
    @Query('period') period?: string,
    @Query('entrepriseId') entrepriseId?: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    return this.service.alerts(
      period,
      req?.user,
      entrepriseId ? Number(entrepriseId) : undefined,
    );
  }
}
