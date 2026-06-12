import { ApiProperty } from '@nestjs/swagger';

export class SystemPostDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class SystemPostPageDto {
  @ApiProperty({ type: [SystemPostDto] })
  items!: readonly SystemPostDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class SystemPostQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false })
  enabled?: boolean | string;
}

export class CreateSystemPostDto {
  @ApiProperty({ example: 'engineer' })
  code!: string;

  @ApiProperty({ example: 'Engineer' })
  name!: string;

  @ApiProperty({ required: false, default: 0 })
  order?: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;
}

export class UpdateSystemPostDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  order?: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;
}
