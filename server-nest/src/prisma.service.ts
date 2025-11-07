import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    const dbUrl = process.env.DATABASE_URL;

    if (
      !dbUrl ||
      !(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))
    ) {
      console.warn(
        'Prisma not connected: missing or invalid DATABASE_URL. Set DATABASE_URL to a valid postgres URL to enable DB connections.',
      );
      return;
    }

    try {
      await this.$connect();
    } catch (err: unknown) {
      // Don't crash the whole app for a DB connection issue during bootstrap.
      // Log the error with a helpful message.
      try {
        const message = (err as { message?: string })?.message ?? String(err);
        console.warn('Prisma failed to connect during onModuleInit:', message);
      } catch {
        // ignore
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
