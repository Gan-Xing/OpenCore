import { Injectable } from '@nestjs/common';
import type {
  QueueControlResultDto,
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

  pauseQueue(name: string): Promise<QueueControlResultDto> {
    return this.repository.pauseQueue(name);
  }

  resumeQueue(name: string): Promise<QueueControlResultDto> {
    return this.repository.resumeQueue(name);
  }
}
