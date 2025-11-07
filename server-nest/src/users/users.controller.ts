import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  list(
    @Query('entrepriseId') entrepriseId?: string,
    @Req() req?: Request & { user?: AuthUser },
  ) {
    const eid = entrepriseId ? Number(entrepriseId) : undefined;
    const user = req?.user as AuthUser | undefined;
    if (user && String(user.role).toUpperCase() === 'ENTREPRISE') {
      const userEnt = user.entrepriseId ?? user.entreprise?.id ?? null;
      if (!userEnt) return [];
      // if client asked for different entrepriseId, deny
      if (eid && Number(eid) !== Number(userEnt)) {
        throw new ForbiddenException('Accès refusé');
      }
      return this.service.list({ entrepriseId: Number(userEnt) });
    }
    return this.service.list({ entrepriseId: eid });
  }

  @Post()
  @Roles('ADMIN_FISCAL')
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @Roles('ADMIN_FISCAL')
  get(@Param('id') id: string) {
    return this.service.get(Number(id));
  }

  @Put(':id')
  @Roles('ADMIN_FISCAL')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @Roles('ADMIN_FISCAL')
  async remove(@Param('id') id: string) {
    await this.service.remove(Number(id));
    return { ok: true };
  }
}
