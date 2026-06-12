import type { INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { createRequestContextMiddleware } from './request-context.middleware';
import { applySecurityBaseline, type SecurityBaselineConfig } from './security';

export type ApiFoundationConfig = SecurityBaselineConfig & {
  globalPrefix: string;
};

export function applyApiFoundation(
  app: INestApplication,
  config: ApiFoundationConfig,
): void {
  app.setGlobalPrefix(config.globalPrefix, {
    exclude: ['health/live', 'health/ready'],
  });
  app.use(createRequestContextMiddleware());
  applySecurityBaseline(app, config);
  app.useGlobalFilters(new HttpExceptionFilter());
}
