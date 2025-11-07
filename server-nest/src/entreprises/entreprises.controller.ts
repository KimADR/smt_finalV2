import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { EntreprisesService } from './entreprises.service';
import {
  CreateEntrepriseDto,
  UpdateEntrepriseDto,
} from './dto/create-entreprise.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/entreprises')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntreprisesController {
  constructor(private readonly service: EntreprisesService) {}

  @Get()
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  findAll(@Req() req?: Request & { user?: AuthUser }) {
    const user = req?.user as AuthUser | undefined;
    // if the authenticated user is an entreprise, only return their entreprise
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const entId = user.entrepriseId ?? user.entreprise?.id ?? null;
      if (entId) return this.service.findAll(Number(entId));
      // no entreprise assigned -> return empty array
      return [];
    }
    return this.service.findAll();
  }

  @Post()
  @Roles('ADMIN_FISCAL')
  create(@Body() dto: CreateEntrepriseDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  findOne(@Req() req: Request & { user?: AuthUser }, @Param('id') id: string) {
    const user = req.user as AuthUser | undefined;
    const entId = Number(id);
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const userEnt = user.entrepriseId ?? user.entreprise?.id ?? null;
      if (!userEnt || Number(userEnt) !== entId) {
        throw new ForbiddenException('Accès refusé');
      }
    }
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  @Roles('ADMIN_FISCAL')
  update(@Param('id') id: string, @Body() dto: UpdateEntrepriseDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @Roles('ADMIN_FISCAL')
  async remove(@Param('id') id: string) {
    await this.service.remove(Number(id));
    return { ok: true };
  }
}
