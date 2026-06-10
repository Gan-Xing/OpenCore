import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { RuntimeConfig } from '../config/runtime-config';

export function createOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('OpenCore API')
    .setDescription('OpenCore API contract')
    .setVersion('0.0.0')
    .addServer('/')
    .build();
}

export function createOpenApiDocument(app: INestApplication) {
  return SwaggerModule.createDocument(app, createOpenApiConfig());
}

export function setupOpenApi(
  app: INestApplication,
  config: RuntimeConfig,
): void {
  if (!config.swaggerEnabled) {
    return;
  }

  SwaggerModule.setup(config.swaggerPath, app, createOpenApiDocument(app));
}
