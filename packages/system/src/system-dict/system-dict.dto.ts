import { ApiProperty } from '@nestjs/swagger';

export class DictItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty()
  sort!: number;

  @ApiProperty()
  enabled!: boolean;
}

export class DictTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ type: [DictItemDto] })
  items!: readonly DictItemDto[];
}

export class DictTypePageDto {
  @ApiProperty({ type: [DictTypeDto] })
  items!: readonly DictTypeDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CreateDictTypeDto {
  @ApiProperty({ example: 'system.status' })
  code!: string;

  @ApiProperty({ example: 'System Status' })
  name!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;

  @ApiProperty({ required: false, type: [DictItemDto] })
  items?: DictItemDto[];
}

export class UpdateDictTypeDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false, type: [DictItemDto] })
  items?: DictItemDto[];
}
