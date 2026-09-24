import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // whitelist: strip unknown fields; transform: coerce payloads to DTO types
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 8001;
  await app.listen(port, '0.0.0.0');
  console.log(`Claims Intelligence API listening on http://0.0.0.0:${port}`);
}

bootstrap();
