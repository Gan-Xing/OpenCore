import { ApiProperty } from '@nestjs/swagger';

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
