import { Injectable } from '@nestjs/common';
import type {
  QueueStatusListDto,
  SystemStatusDto,
  VersionInfoDto,
} from './monitor.dto';
import { MonitorRepository } from './monitor.repository';

@Injectable()
export class MonitorService {
  constructor(private readonly repository: MonitorRepository) {}

  getSystemStatus(): Promise<SystemStatusDto> {
    return this.repository.getSystemStatus();
  }

  getVersionInfo(): VersionInfoDto {
    return this.repository.getVersionInfo();
  }

  listQueues(): Promise<QueueStatusListDto> {
    return this.repository.listQueues();
  }
}
