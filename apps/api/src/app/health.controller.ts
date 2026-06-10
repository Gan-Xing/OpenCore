import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

type HealthCheck = {
  name: 'process' | 'config';
  status: 'ok';
  critical: boolean;
};

type HealthResponse = {
  status: 'ok' | 'ready';
  service: 'opencore-api';
  version: '0.0.0';
  timestamp: string;
  uptimeSeconds: number;
  checks: HealthCheck[];
};

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get('live')
  @ApiOkResponse({
    description: 'Process liveness probe.',
    schema: {
      example: {
        status: 'ok',
        service: 'opencore-api',
        version: '0.0.0',
        timestamp: '2026-06-10T00:00:00.000Z',
        uptimeSeconds: 1,
        checks: [
          {
            name: 'process',
            status: 'ok',
            critical: true,
          },
        ],
      },
    },
  })
  live(): HealthResponse {
    return this.createHealthResponse('ok', [
      {
        name: 'process',
        status: 'ok',
        critical: true,
      },
    ]);
  }

  @Get('ready')
  @ApiOkResponse({
    description: 'Readiness probe for S4 foundation dependencies.',
    schema: {
      example: {
        status: 'ready',
        service: 'opencore-api',
        version: '0.0.0',
        timestamp: '2026-06-10T00:00:00.000Z',
        uptimeSeconds: 1,
        checks: [
          {
            name: 'process',
            status: 'ok',
            critical: true,
          },
          {
            name: 'config',
            status: 'ok',
            critical: true,
          },
        ],
      },
    },
  })
  ready(): HealthResponse {
    return this.createHealthResponse('ready', [
      {
        name: 'process',
        status: 'ok',
        critical: true,
      },
      {
        name: 'config',
        status: 'ok',
        critical: true,
      },
    ]);
  }

  private createHealthResponse(
    status: HealthResponse['status'],
    checks: HealthCheck[],
  ): HealthResponse {
    return {
      status,
      service: 'opencore-api',
      version: '0.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks,
    };
  }
}
