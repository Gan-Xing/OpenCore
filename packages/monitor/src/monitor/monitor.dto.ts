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

export class SystemStatusDto {
  @ApiProperty({ enum: ['degraded', 'ok'] })
  status!: 'degraded' | 'ok';

  @ApiProperty()
  checkedAt!: string;

  @ApiProperty()
  uptimeSeconds!: number;

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
