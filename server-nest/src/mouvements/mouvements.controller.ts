import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { MouvementsService } from './mouvements.service';
import { Param, Put, Delete } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/mouvements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MouvementsController {
  constructor(private readonly service: MouvementsService) {}

  @Get()
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  list(
    @Req() req: Request & { user?: AuthUser },
    @Query('period') period?: string,
    @Query('entrepriseId') entrepriseId?: string,
  ): Promise<any> {
    // service will inspect req.user if needed; admin can pass entrepriseId
    return this.service.list(
      req.user as AuthUser | undefined,
      period,
      entrepriseId ? Number(entrepriseId) : undefined,
    );
  }

  @Get('stats')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  async stats(
    @Req() req: Request & { user?: AuthUser },
    @Query('period') period?: string,
    @Query('entrepriseId') entrepriseId?: string,
  ): Promise<any> {
    const entId = entrepriseId ? Number(entrepriseId) : undefined;
    return this.service.stats(req.user as AuthUser | undefined, period, entId);
  }

  @Get(':id')
  @Roles('ADMIN_FISCAL', 'AGENT_FISCAL', 'ENTREPRISE')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: AuthUser },
  ): Promise<any> {
    return this.service.getById(id, req.user as AuthUser | undefined);
  }

  @Post()
  @Roles('ADMIN_FISCAL', 'ENTREPRISE')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
    }),
  )
  async create(
    @Req() req: Request & { user?: AuthUser },
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<any> {
    // Reject temp/negative entreprise ids at controller level early
    const entrepriseIdRaw = body['entrepriseId'] ?? body['entreprise_id'];
    if (typeof entrepriseIdRaw !== 'undefined') {
      const entrepriseIdNum = Number(entrepriseIdRaw);
      if (
        !Number.isFinite(entrepriseIdNum) ||
        !Number.isInteger(entrepriseIdNum) ||
        entrepriseIdNum <= 0
      ) {
        // If client sent a temporary negative id, reject with 400 for clarity
        throw new BadRequestException('entrepriseId invalide');
      }
    }
    try {
      // Diagnostic logging (trim for safety)
      try {
        const rb = (req.body ?? {}) as Record<string, unknown>;
        console.debug(
          '[mouvements.create] body keys:',
          Object.keys(rb).slice(0, 20),
        );
        console.debug(
          '[mouvements.create] files count:',
          Array.isArray(files) ? files.length : 0,
        );
        if (Array.isArray(files)) {
          console.debug(
            '[mouvements.create] files sample:',
            files.slice(0, 3).map((f) => ({
              originalname: f.originalname,
              size: f.size,
              mimetype: f.mimetype,
              hasBuffer: !!(f as Express.Multer.File & { buffer?: Buffer })
                .buffer,
            })),
          );
        }
      } catch {
        // ignore diagnostic logging errors
      }

      // If multipart/form-data, files will be present
      if (files && files.length > 0) {
        return await this.service.createFromMultipart(
          req.body as Record<string, unknown>,
          files,
          req.user as AuthUser | undefined,
        );
      }

      // Otherwise expect JSON body
      return await this.service.createFromBody(
        body,
        req.user as AuthUser | undefined,
      );
    } catch (err: unknown) {
      try {
        const stack = (err as { stack?: string })?.stack ?? String(err);
        console.error('[mouvements.create] error:', stack);
      } catch {
        // ignore
      }
      throw err;
    }
  }

  @Put(':id')
  @Roles('ADMIN_FISCAL', 'ENTREPRISE')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: AuthUser },
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<any> {
    // Reject temporary negative ids immediately
    if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('id invalide');
    }

    // If body contains entrepriseId, validate it too
    const entrepriseIdRaw = body['entrepriseId'] ?? body['entreprise_id'];
    if (typeof entrepriseIdRaw !== 'undefined') {
      const entrepriseIdNum = Number(entrepriseIdRaw);
      if (
        !Number.isFinite(entrepriseIdNum) ||
        !Number.isInteger(entrepriseIdNum) ||
        entrepriseIdNum <= 0
      ) {
        throw new BadRequestException('entrepriseId invalide');
      }
    }
    try {
      // diagnostic logging
      try {
        const rb = (req.body ?? {}) as Record<string, unknown>;
        console.debug(
          '[mouvements.update] body keys:',
          Object.keys(rb).slice(0, 20),
        );
        console.debug(
          '[mouvements.update] files count:',
          Array.isArray(files) ? files.length : 0,
        );
      } catch {
        // ignore
      }

      if (files && files.length > 0) {
        return await this.service.updateFromMultipart(
          id,
          req.body as Record<string, unknown>,
          files,
          req.user as AuthUser | undefined,
        );
      }

      return await this.service.update(
        id,
        body,
        req.user as AuthUser | undefined,
      );
    } catch (err: unknown) {
      try {
        const stack = (err as { stack?: string })?.stack ?? String(err);
        console.error('[mouvements.update] error:', stack);
      } catch {
        // ignore
      }
      throw err;
    }
  }

  @Delete(':id')
  @Roles('ADMIN_FISCAL', 'ENTREPRISE')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: AuthUser },
  ): Promise<{ id: number }> {
    return this.service.remove(id, req.user as AuthUser | undefined);
  }
}
