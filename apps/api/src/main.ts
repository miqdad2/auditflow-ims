import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // DEMO_ALLOWED_ORIGINS adds comma-separated extra origins (e.g. ngrok tunnel URLs)
  // without changing the permanent CORS_ORIGIN. Remove after demo.
  const baseOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const demoOrigins = process.env.DEMO_ALLOWED_ORIGINS
    ? process.env.DEMO_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  const allowedOrigins = [baseOrigin, ...demoOrigins];

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);
  console.log(`RECAFCO AuditFlow IMS API running on http://localhost:${port}`);
}
bootstrap();
