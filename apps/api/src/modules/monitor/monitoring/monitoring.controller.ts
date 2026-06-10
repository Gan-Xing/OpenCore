import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  QueueStatusListDto,
  SystemStatusDto,
  VersionInfoDto,
} from './monitoring.dto';
import { MonitoringRepository } from './monitoring.repository';

@ApiBearerAuth()
@ApiTags('Monitor')
@Controller('monitor')
export class MonitoringController {
  constructor(private readonly repository: MonitoringRepository) {}

  @Get('status')
  @RequirePermission('monitor:status:read')
  @ApiOkResponse({ type: SystemStatusDto })
  getStatus(): SystemStatusDto {
    return this.repository.getSystemStatus();
  }

  @Get('version')
  @RequirePermission('monitor:version:read')
  @ApiOkResponse({ type: VersionInfoDto })
  getVersion(): VersionInfoDto {
    return this.repository.getVersionInfo();
  }

  @Get('queues')
  @RequirePermission('monitor:queue:read')
  @ApiOkResponse({ type: QueueStatusListDto })
  listQueues(): QueueStatusListDto {
    return this.repository.listQueues();
  }
}
