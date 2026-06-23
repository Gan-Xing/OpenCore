import { ApiProperty } from '@nestjs/swagger';

export class DictItemDto {
  @ApiProperty()
  tenantId!: string;

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

  @ApiProperty({ required: false })
  deletedAt?: string;
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
  tenantId!: string;

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

  @ApiProperty({ required: false })
  deletedAt?: string;

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

  @ApiProperty({ required: false, type: () => [CreateDictItemDto] })
  items?: CreateDictItemDto[];
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

  @ApiProperty({ required: false, type: () => [CreateDictItemDto] })
  items?: CreateDictItemDto[];
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

export class DictImportTemplateDto {
  @ApiProperty()
  filename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  contentBase64!: string;

  @ApiProperty({ type: [String] })
  columns!: readonly string[];

  @ApiProperty()
  rowCount!: number;
}

export class ImportDictsDto {
  @ApiProperty({ description: 'Base64-encoded CSV or XLSX content.' })
  contentBase64!: string;

  @ApiProperty({ required: false, default: false })
  updateExisting?: boolean;
}

export class DictImportFailureDto {
  @ApiProperty()
  rowNumber!: number;

  @ApiProperty({ required: false })
  dictCode?: string;

  @ApiProperty({ required: false })
  itemValue?: string;

  @ApiProperty()
  reason!: string;
}

export class DictImportResultDto {
  @ApiProperty()
  dryRun!: boolean;

  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  createdDicts!: number;

  @ApiProperty()
  updatedDicts!: number;

  @ApiProperty()
  createdItems!: number;

  @ApiProperty()
  updatedItems!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: [String] })
  createdDictCodes!: readonly string[];

  @ApiProperty({ type: [String] })
  updatedDictCodes!: readonly string[];

  @ApiProperty({ type: [String] })
  createdItemRefs!: readonly string[];

  @ApiProperty({ type: [String] })
  updatedItemRefs!: readonly string[];

  @ApiProperty({ type: [DictImportFailureDto] })
  failures!: readonly DictImportFailureDto[];
}

export class DictTranslationEntryDto {
  @ApiProperty({ example: 'system.status' })
  dictCode!: string;

  @ApiProperty({ type: [String], example: ['enabled', 'disabled'] })
  values!: readonly string[];
}

export class TranslateDictValuesDto {
  @ApiProperty({ type: [DictTranslationEntryDto] })
  entries!: readonly DictTranslationEntryDto[];
}

export class DictTranslationItemDto {
  @ApiProperty()
  dictCode!: string;

  @ApiProperty()
  value!: string;

  @ApiProperty()
  found!: boolean;

  @ApiProperty({ required: false })
  label?: string;

  @ApiProperty({ required: false })
  colorType?: string;

  @ApiProperty({ required: false })
  cssClass?: string;

  @ApiProperty({ required: false })
  enabled?: boolean;
}

export class DictTranslationResultDto {
  @ApiProperty({ type: [DictTranslationItemDto] })
  items!: readonly DictTranslationItemDto[];

  @ApiProperty()
  translatedAt!: string;
}
