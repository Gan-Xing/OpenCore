import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { loadRuntimeConfig } from './platform/config/runtime-config';
import { StructuredLogger } from './platform/logging/structured-logger';
import { setupOpenApi } from './platform/openapi/openapi';
import { applyApiFoundation } from './platform/setup/apply-api-foundation';

async function bootstrap() {
  const config = loadRuntimeConfig();
  const logger = new StructuredLogger(config.serviceName);
  const app = await NestFactory.create(AppModule);

  applyApiFoundation(app, config);
  setupOpenApi(app, config);

  await app.listen(config.port);
  logger.info('api.ready', {
    port: config.port,
    globalPrefix: config.globalPrefix,
    swaggerEnabled: config.swaggerEnabled,
  });
  logger.info('api.health.live', {
    path: '/health/live',
  });
  logger.info('api.health.ready', {
    path: '/health/ready',
  });

  if (config.swaggerEnabled) {
    logger.info('api.openapi.ready', {
      path: `/${config.swaggerPath}`,
    });
  }
}

void bootstrap();
