import { ApiProperty } from '@nestjs/swagger';

export class SystemConfigDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'number', 'string'] })
  valueType!: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  public!: boolean;

  @ApiProperty({ enum: ['private', 'public', 'secret'] })
  visibility!: 'private' | 'public' | 'secret';
}

export class SystemConfigPageDto {
  @ApiProperty({ type: [SystemConfigDto] })
  items!: readonly SystemConfigDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CreateSystemConfigDto {
  @ApiProperty({ example: 'opencore.admin.title' })
  key!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: ['boolean', 'number', 'string'] })
  valueType!: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, default: false })
  public?: boolean;

  @ApiProperty({ required: false, enum: ['private', 'public', 'secret'] })
  visibility?: 'private' | 'public' | 'secret';
}

export class UpdateSystemConfigDto {
  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty({ required: false, enum: ['boolean', 'number', 'string'] })
  valueType?: 'boolean' | 'number' | 'string';

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  public?: boolean;

  @ApiProperty({ required: false, enum: ['private', 'public', 'secret'] })
  visibility?: 'private' | 'public' | 'secret';
}
