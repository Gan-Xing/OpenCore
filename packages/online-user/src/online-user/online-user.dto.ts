import { ApiProperty } from '@nestjs/swagger';

export class OnlineUserSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  tokenId!: string;

  @ApiProperty()
  ip!: string;

  @ApiProperty()
  userAgent!: string;

  @ApiProperty()
  browser!: string;

  @ApiProperty()
  os!: string;

  @ApiProperty()
  lastSeenAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ required: false })
  revokedAt?: string;

  @ApiProperty({ required: false })
  revokedBy?: string;

  @ApiProperty({ required: false })
  revokedReason?: string;
}

export class OnlineUserSessionPageDto {
  @ApiProperty({ type: [OnlineUserSessionDto] })
  items!: readonly OnlineUserSessionDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class OnlineUserQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false })
  active?: boolean | string;

  @ApiProperty({ required: false })
  username?: string;
}

export class KickOutSessionDto {
  @ApiProperty()
  actor!: string;

  @ApiProperty()
  reason!: string;
}

export class BatchKickOutSessionsDto extends KickOutSessionDto {
  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class BatchKickOutSessionsResultDto {
  @ApiProperty()
  requested!: number;

  @ApiProperty()
  kicked!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty({ type: [OnlineUserSessionDto] })
  items!: readonly OnlineUserSessionDto[];
}

export class CleanExpiredOnlineUserSessionsQueryDto {
  @ApiProperty({ required: false })
  expiredBefore?: string;
}

export class CleanExpiredOnlineUserSessionsResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty()
  expiredBefore!: string;
}

export class OnlineUserSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  activeUsers!: number;

  @ApiProperty()
  revoked!: number;

  @ApiProperty()
  expired!: number;

  @ApiProperty()
  cleanupEligible!: number;
}
