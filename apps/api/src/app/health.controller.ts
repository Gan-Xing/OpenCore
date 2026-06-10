import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

type HealthResponse = {
  status: 'ok' | 'ready';
  service: 'opencore-api';
  checks?: string[];
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
      },
    },
  })
  live(): HealthResponse {
    return {
      status: 'ok',
      service: 'opencore-api',
    };
  }

  @Get('ready')
  @ApiOkResponse({
    description: 'Readiness probe. S2 has no external dependencies yet.',
    schema: {
      example: {
        status: 'ready',
        service: 'opencore-api',
        checks: [],
      },
    },
  })
  ready(): HealthResponse {
    return {
      status: 'ready',
      service: 'opencore-api',
      checks: [],
    };
  }
}
