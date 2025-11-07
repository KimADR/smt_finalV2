import { Module } from '@nestjs/common';
import { EntreprisesController } from './entreprises.controller';
import { EntreprisesService } from './entreprises.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [EntreprisesController],
  providers: [EntreprisesService, PrismaService],
})
export class EntreprisesModule {}
