import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
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
  app.use(createDuplicateGlobalPrefixMiddleware(config.globalPrefix));
  app.setGlobalPrefix(config.globalPrefix, {
    exclude: ['health/live', 'health/ready'],
  });
  app.use(createRequestContextMiddleware());
  applySecurityBaseline(app, config);
  app.useGlobalFilters(new HttpExceptionFilter());
}

export function createDuplicateGlobalPrefixMiddleware(globalPrefix: string) {
  return (
    request: IncomingMessage,
    _response: ServerResponse,
    next: () => void,
  ): void => {
    request.url = normalizeDuplicateGlobalPrefixUrl(request.url, globalPrefix);
    next();
  };
}

export function normalizeDuplicateGlobalPrefixUrl(
  rawUrl: string | undefined,
  globalPrefix: string,
): string | undefined {
  const normalizedPrefix = normalizeGlobalPrefix(globalPrefix);

  if (!rawUrl || !normalizedPrefix) {
    return rawUrl;
  }

  const queryIndex = rawUrl.indexOf('?');
  const pathname = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
  const suffix = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';
  const duplicatePrefixPattern = new RegExp(
    `^${escapeRegExp(normalizedPrefix)}(?:${escapeRegExp(
      normalizedPrefix,
    )})+(?=/|$)`,
    'u',
  );
  const normalizedPathname = pathname.replace(
    duplicatePrefixPattern,
    normalizedPrefix,
  );

  if (normalizedPathname === pathname) {
    return rawUrl;
  }

  return `${normalizedPathname}${suffix}`;
}

function normalizeGlobalPrefix(globalPrefix: string): string | undefined {
  const prefix = globalPrefix.trim().replace(/^\/+|\/+$/gu, '');

  if (!prefix) {
    return undefined;
  }

  return `/${prefix}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
