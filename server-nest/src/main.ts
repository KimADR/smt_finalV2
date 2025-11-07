import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cors from 'cors';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.use(cors({ origin, credentials: true }));

  // Increase payload size limits for avatar uploads
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT || 4000);

  // Note: attachments for mouvements are stored in-memory as data URLs, and
  // user avatars are stored as DB strings. We do not serve a static uploads
  // directory here (no disk storage for mouvement attachments).

  // Swagger - only enabled in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SMT API')
      .setDescription('API documentation for SMT')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    try {
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    } catch (err: unknown) {
      // If swagger scanning fails (peer dependency mismatch), don't crash the app.
      // Log the error and continue without swagger docs.
      try {
        // prefer to safely read message if available
        const message = (err as { message?: string })?.message ?? String(err);
        console.warn('Swagger module failed to initialize:', message);
      } catch {
        // ignore
      }
    }
  }
  await app.listen(port);
}

void bootstrap().catch((e) => {
  // Ensure any bootstrap error is logged and process exits non-zero
  console.error('Application bootstrap failed:', e);
  process.exit(1);
});
