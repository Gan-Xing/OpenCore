import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto, MonitorHealthService } from '@opencore/monitor';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: MonitorHealthService) {}

  @Get('live')
  @ApiOkResponse({
    description: 'Process liveness probe.',
    type: HealthResponseDto,
  })
  live(): HealthResponseDto {
    return this.health.live();
  }

  @Get('ready')
  @ApiOkResponse({
    description: 'Readiness probe for S4 foundation dependencies.',
    type: HealthResponseDto,
  })
  ready(): HealthResponseDto {
    return this.health.ready();
  }
}
