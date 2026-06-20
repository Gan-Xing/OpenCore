import { ApiProperty } from '@nestjs/swagger';

export class DictItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  dictCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty()
  sort!: number;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ required: false })
  colorType?: string;

  @ApiProperty({ required: false })
  cssClass?: string;

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class DictDataOptionDto extends DictItemDto {}

export class DictDataOptionQueryDto {
  @ApiProperty({ required: false, example: 'system.status' })
  dictCode?: string;
}

export class DictTypeQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  enabled?: boolean | string;

  @ApiProperty({ required: false })
  createdFrom?: string;

  @ApiProperty({ required: false })
  createdTo?: string;
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

  @ApiProperty({ required: false })
  remark?: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  system!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

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

export class DictItemQueryDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number | string;

  @ApiProperty({ required: false, default: 10 })
  pageSize?: number | string;

  @ApiProperty({ required: false, example: 'system.status' })
  dictCode?: string;

  @ApiProperty({ required: false })
  label?: string;

  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty({ required: false })
  enabled?: boolean | string;
}

export class DictItemPageDto {
  @ApiProperty({ type: [DictItemDto] })
  items!: readonly DictItemDto[];

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

  @ApiProperty({ required: false })
  remark?: string;

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
  remark?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false, type: [DictItemDto] })
  items?: DictItemDto[];
}

export class CreateDictItemDto {
  @ApiProperty({ required: false })
  id?: string;

  @ApiProperty({ example: 'Enabled' })
  label!: string;

  @ApiProperty({ example: 'enabled' })
  value!: string;

  @ApiProperty({ required: false, default: 0 })
  sort?: number;

  @ApiProperty({ required: false, default: true })
  enabled?: boolean;

  @ApiProperty({ required: false })
  colorType?: string;

  @ApiProperty({ required: false })
  cssClass?: string;

  @ApiProperty({ required: false })
  remark?: string;
}

export class UpdateDictItemDto {
  @ApiProperty({ required: false })
  label?: string;

  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty({ required: false })
  sort?: number;

  @ApiProperty({ required: false })
  enabled?: boolean;

  @ApiProperty({ required: false })
  colorType?: string;

  @ApiProperty({ required: false })
  cssClass?: string;

  @ApiProperty({ required: false })
  remark?: string;
}

export class BatchDeleteDictTypesDto {
  @ApiProperty({ type: [String] })
  codes!: readonly string[];
}

export class BatchDeleteDictItemsDto {
  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class BatchUpdateDictStatusDto {
  @ApiProperty({ type: [String] })
  codes!: readonly string[];

  @ApiProperty()
  enabled!: boolean;
}

export class BatchUpdateDictItemStatusDto {
  @ApiProperty({ type: [String] })
  ids!: readonly string[];

  @ApiProperty()
  enabled!: boolean;
}

export class DictBatchMutationResultDto {
  @ApiProperty()
  updated!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  codes!: readonly string[];
}

export class DictDeleteMutationResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  codes!: readonly string[];
}

export class DictItemBatchMutationResultDto {
  @ApiProperty()
  updated!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class DictItemDeleteMutationResultDto {
  @ApiProperty()
  deleted!: true;

  @ApiProperty()
  affected!: number;

  @ApiProperty({ type: [String] })
  ids!: readonly string[];
}

export class DictCacheRefreshDto {
  @ApiProperty()
  refreshed!: true;

  @ApiProperty()
  cachedKeys!: number;

  @ApiProperty()
  refreshedAt!: string;
}
