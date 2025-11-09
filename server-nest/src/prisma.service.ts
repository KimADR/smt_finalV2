import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private configService: ConfigService) {
    // Don't throw at construction time — the ConfigModule may not have
    // populated env values when DI instantiates providers in some setups.
    // Let PrismaClient read from process.env at runtime and handle
    // connection retries in onModuleInit instead.
    super();
  }

  async onModuleInit() {
    const dbUrl = this.configService.get<string>('DATABASE_URL');

    if (
      !dbUrl ||
      !(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))
    ) {
      console.warn(
        'Prisma not connected: missing or invalid DATABASE_URL. Set DATABASE_URL to a valid postgres URL to enable DB connections.',
      );
      return;
    }

      let retries = 5;
      const retryDelay = 5000; // 5 seconds

      while (retries > 0) {
        try {
          await this.$connect();
          console.log('Successfully connected to database');
          return;
        } catch (err) {
          retries--;
          console.log(`Failed to connect to database. Retries left: ${retries}`);
          console.error('Connection error:', err);

          if (retries === 0) {
            console.error('Max retries reached. Could not connect to database.');
            throw err;
          }

          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
  }

  enableShutdownHooks(app: INestApplication) {
    // @ts-expect-error Prisma event typing
    this.$on('beforeExit', () => {
      void app.close().catch(() => {
        // ignore close errors during shutdown
      });
    });
  }
}
