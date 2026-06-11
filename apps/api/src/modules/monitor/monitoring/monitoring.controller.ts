import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MonitorService } from '@opencore/monitor';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  QueueStatusListDto,
  SystemStatusDto,
  VersionInfoDto,
} from './monitoring.dto';

@ApiBearerAuth()
@Controller('monitor')
export class MonitoringController {
  constructor(private readonly monitor: MonitorService) {}

  @Get('status')
  @ApiTags('Monitor Status')
  @RequirePermission('monitor:status:read')
  @ApiOkResponse({ type: SystemStatusDto })
  getStatus(): Promise<SystemStatusDto> {
    return this.monitor.getSystemStatus();
  }

  @Get('version')
  @ApiTags('Monitor Version')
  @RequirePermission('monitor:version:read')
  @ApiOkResponse({ type: VersionInfoDto })
  getVersion(): VersionInfoDto {
    return this.monitor.getVersionInfo();
  }

  @Get('queues')
  @ApiTags('Monitor Queues')
  @RequirePermission('monitor:queue:read')
  @ApiOkResponse({ type: QueueStatusListDto })
  listQueues(): Promise<QueueStatusListDto> {
    return this.monitor.listQueues();
  }
}
