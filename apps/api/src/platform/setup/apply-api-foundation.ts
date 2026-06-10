import type { INestApplication } from '@nestjs/common';
import type { RuntimeConfig } from '../config/runtime-config';
import { HttpExceptionFilter } from '../errors/http-exception.filter';
import { createRequestContextMiddleware } from '../request-context/request-context.middleware';
import { applySecurityBaseline } from '../security/security';

export function applyApiFoundation(
  app: INestApplication,
  config: RuntimeConfig,
): void {
  app.setGlobalPrefix(config.globalPrefix, {
    exclude: ['health/live', 'health/ready'],
  });
  app.use(createRequestContextMiddleware());
  applySecurityBaseline(app, config);
  app.useGlobalFilters(new HttpExceptionFilter());
}
