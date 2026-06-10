import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RuntimeConfig } from '../config/runtime-config';

type ExpressLikeInstance = {
  disable?: (setting: string) => void;
};

export function applySecurityBaseline(
  app: INestApplication,
  config: RuntimeConfig,
): void {
  const instance = app.getHttpAdapter().getInstance() as ExpressLikeInstance;
  instance.disable?.('x-powered-by');

  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
  });
  app.use(createSecurityHeadersMiddleware());
}

export function createSecurityHeadersMiddleware(): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void {
  return (_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    next();
  };
}
