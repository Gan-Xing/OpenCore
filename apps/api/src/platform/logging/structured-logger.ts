import type { RequestContext } from '../request-context/request-context';

export type StructuredLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type StructuredLogEntry = {
  timestamp: string;
  level: StructuredLogLevel;
  service: 'opencore-api';
  message: string;
  requestId?: string;
  traceId?: string;
  context?: Record<string, string | number | boolean | null>;
};

export class StructuredLogger {
  constructor(private readonly service: 'opencore-api') {}

  debug(
    message: string,
    context?: StructuredLogEntry['context'],
    requestContext?: RequestContext,
  ): void {
    this.write('debug', message, context, requestContext);
  }

  info(
    message: string,
    context?: StructuredLogEntry['context'],
    requestContext?: RequestContext,
  ): void {
    this.write('info', message, context, requestContext);
  }

  warn(
    message: string,
    context?: StructuredLogEntry['context'],
    requestContext?: RequestContext,
  ): void {
    this.write('warn', message, context, requestContext);
  }

  error(
    message: string,
    context?: StructuredLogEntry['context'],
    requestContext?: RequestContext,
  ): void {
    this.write('error', message, context, requestContext);
  }

  private write(
    level: StructuredLogLevel,
    message: string,
    context?: StructuredLogEntry['context'],
    requestContext?: RequestContext,
  ): void {
    const entry = createStructuredLogEntry({
      service: this.service,
      level,
      message,
      context,
      requestContext,
    });
    const line = JSON.stringify(entry);

    if (level === 'error') {
      console.error(line);
      return;
    }

    console.log(line);
  }
}

export function createStructuredLogEntry(options: {
  service: 'opencore-api';
  level: StructuredLogLevel;
  message: string;
  context?: StructuredLogEntry['context'];
  requestContext?: RequestContext;
  timestamp?: string;
}): StructuredLogEntry {
  return {
    timestamp: options.timestamp ?? new Date().toISOString(),
    level: options.level,
    service: options.service,
    message: options.message,
    requestId: options.requestContext?.requestId,
    traceId: options.requestContext?.traceId,
    context: options.context,
  };
}
