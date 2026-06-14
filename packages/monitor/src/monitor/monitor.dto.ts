import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckDto {
  @ApiProperty({ enum: ['process', 'config'] })
  name!: 'process' | 'config';

  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';

  @ApiProperty()
  critical!: boolean;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'ready'] })
  status!: 'ok' | 'ready';

  @ApiProperty({ enum: ['opencore-api'] })
  service!: 'opencore-api';

  @ApiProperty({ enum: ['0.0.0'] })
  version!: '0.0.0';

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  uptimeSeconds!: number;

  @ApiProperty({ type: [HealthCheckDto] })
  checks!: readonly HealthCheckDto[];
}

export class DependencyStatusDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['degraded', 'ok'] })
  status!: 'degraded' | 'ok';

  @ApiProperty()
  latencyMs!: number;

  @ApiProperty()
  message!: string;
}

export class RuntimeCpuStatusDto {
  @ApiProperty()
  logicalCores!: number;

  @ApiProperty()
  loadAverage1m!: number;

  @ApiProperty()
  loadAverage5m!: number;

  @ApiProperty()
  loadAverage15m!: number;

  @ApiProperty()
  processUserMicros!: number;

  @ApiProperty()
  processSystemMicros!: number;
}

export class RuntimeMemoryStatusDto {
  @ApiProperty()
  rssBytes!: number;

  @ApiProperty()
  heapUsedBytes!: number;

  @ApiProperty()
  heapTotalBytes!: number;

  @ApiProperty()
  externalBytes!: number;

  @ApiProperty()
  systemTotalBytes!: number;

  @ApiProperty()
  systemFreeBytes!: number;

  @ApiProperty()
  processRssRatio!: number;

  @ApiProperty()
  systemUsedRatio!: number;
}

export class RuntimeDiskStatusDto {
  @ApiProperty()
  path!: string;

  @ApiProperty()
  totalBytes!: number;

  @ApiProperty()
  freeBytes!: number;

  @ApiProperty()
  usedBytes!: number;

  @ApiProperty()
  usedRatio!: number;
}

export class RuntimeProcessStatusDto {
  @ApiProperty()
  pid!: number;

  @ApiProperty()
  nodeVersion!: string;

  @ApiProperty()
  platform!: string;

  @ApiProperty()
  arch!: string;

  @ApiProperty()
  uptimeSeconds!: number;

  @ApiProperty()
  startedAt!: string;
}

export class RuntimeResourceStatusDto {
  @ApiProperty()
  sampledAt!: string;

  @ApiProperty({ type: RuntimeProcessStatusDto })
  process!: RuntimeProcessStatusDto;

  @ApiProperty({ type: RuntimeCpuStatusDto })
  cpu!: RuntimeCpuStatusDto;

  @ApiProperty({ type: RuntimeMemoryStatusDto })
  memory!: RuntimeMemoryStatusDto;

  @ApiProperty({ type: RuntimeDiskStatusDto })
  disk!: RuntimeDiskStatusDto;
}

export class SystemStatusDto {
  @ApiProperty({ enum: ['degraded', 'ok'] })
  status!: 'degraded' | 'ok';

  @ApiProperty()
  checkedAt!: string;

  @ApiProperty()
  uptimeSeconds!: number;

  @ApiProperty({ type: RuntimeResourceStatusDto })
  runtime!: RuntimeResourceStatusDto;

  @ApiProperty({ type: [DependencyStatusDto] })
  dependencies!: readonly DependencyStatusDto[];
}

export class VersionInfoDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  commit!: string;

  @ApiProperty()
  buildTime!: string;

  @ApiProperty()
  nodeVersion!: string;

  @ApiProperty()
  runtime!: string;

  @ApiProperty()
  environment!: string;

  @ApiProperty()
  platform!: string;

  @ApiProperty()
  arch!: string;

  @ApiProperty()
  processId!: number;

  @ApiProperty()
  uptimeSeconds!: number;

  @ApiProperty()
  startedAt!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  deploymentId!: string;
}

export class QueueStatusDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  driver!: string;

  @ApiProperty()
  waiting!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  paused!: boolean;

  @ApiProperty()
  readOnly!: true;
}

export class QueueStatusListDto {
  @ApiProperty()
  checkedAt!: string;

  @ApiProperty({ type: [QueueStatusDto] })
  queues!: readonly QueueStatusDto[];
}
