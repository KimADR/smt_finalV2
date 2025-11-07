import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { NotificationsController } from '../notifications/notifications.controller';
import { PrismaService } from '../prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsScheduler } from './alerts.scheduler';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ScheduleModule, AuthModule],
  controllers: [AlertsController, NotificationsController],
  providers: [
    AlertsService,
    PrismaService,
    AlertsScheduler,
    NotificationsGateway,
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
