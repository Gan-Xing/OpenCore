import { ApiProperty } from '@nestjs/swagger';

export class LoginLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  success!: boolean;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty()
  ip!: string;

  @ApiProperty()
  userAgent!: string;

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
  success?: boolean | string;
}
