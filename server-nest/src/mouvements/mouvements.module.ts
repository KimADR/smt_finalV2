import { Module } from '@nestjs/common';
import { MouvementsController } from './mouvements.controller';
import { MouvementsService } from './mouvements.service';
import { PrismaService } from '../prisma.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  controllers: [MouvementsController],
  imports: [AlertsModule],
  providers: [MouvementsService, PrismaService],
})
export class MouvementsModule {}
