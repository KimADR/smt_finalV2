import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsModule } from './alerts/alerts.module';
import { DebugNotificationsController } from './notifications/debug.controller';

import { EntreprisesModule } from './entreprises/entreprises.module';
import { UsersModule } from './users/users.module';
import { MouvementsModule } from './mouvements/mouvements.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportsModule } from './reports/reports.module';
import { AuthModule } from './auth/auth.module';

const devControllers =
  process.env.NODE_ENV !== 'production' ? [DebugNotificationsController] : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    EntreprisesModule,
    UsersModule,
    MouvementsModule,
    AnalyticsModule,
    ReportsModule,
    AuthModule,
    ScheduleModule.forRoot(),
    AlertsModule,
  ],
  controllers: [...devControllers],
  providers: [PrismaService],
})
export class AppModule {}
