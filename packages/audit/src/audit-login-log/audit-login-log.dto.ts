import { ApiProperty } from '@nestjs/swagger';

export class LoginLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({
    enum: [
      'login.mobile',
      'login.sms',
      'login.social',
      'login.username',
      'logout.force',
      'logout.self',
    ],
  })
  logType!:
    | 'login.mobile'
    | 'login.sms'
    | 'login.social'
    | 'login.username'
    | 'logout.force'
    | 'logout.self';

  @ApiProperty({
    enum: [
      'account_locked',
      'bad_credentials',
      'captcha_code_error',
      'captcha_not_found',
      'success',
      'user_disabled',
    ],
  })
  result!:
    | 'account_locked'
    | 'bad_credentials'
    | 'captcha_code_error'
    | 'captcha_not_found'
    | 'success'
    | 'user_disabled';

  @ApiProperty()
  success!: boolean;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty({ required: false })
  actorUsername?: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty()
  ip!: string;

  @ApiProperty()
  userAgent!: string;

  @ApiProperty()
  browser!: string;

  @ApiProperty()
  os!: string;

  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  createdAt!: string;
}

export class LoginLogPageDto {
  @ApiProperty({ type: [LoginLogDto] })
  items!: readonly LoginLogDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class LoginLogQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false })
  username?: string;

  @ApiProperty({ required: false })
  actorUsername?: string;

  @ApiProperty({ required: false })
  logType?: string;

  @ApiProperty({ required: false })
  result?: string;

  @ApiProperty({ required: false })
  success?: boolean | string;

  @ApiProperty({ required: false })
  ip?: string;

  @ApiProperty({ required: false })
  createdFrom?: string;

  @ApiProperty({ required: false })
  createdTo?: string;
}

export class BatchDeleteLoginLogsDto {
  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class LoginLogBatchMutationResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class LoginLogCleanResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;
}
