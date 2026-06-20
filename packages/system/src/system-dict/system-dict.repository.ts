import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createApiErrorBody,
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  BatchDeleteDictItemsDto,
  BatchDeleteDictTypesDto,
  BatchUpdateDictItemStatusDto,
  BatchUpdateDictStatusDto,
  CreateDictItemDto,
  CreateDictTypeDto,
  DictDataOptionQueryDto,
  DictItemQueryDto,
  DictTypeQueryDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
} from './system-dict.dto';
import type {
  DictDataOptionRecord,
  DictItemRecord,
  DictTypeRecord,
} from './system-dict.records';

export type SystemDictExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

export type DictDeleteMutationRecord = {
  deleted: true;
  affected: number;
  codes: readonly string[];
};

export type DictBatchMutationRecord = {
  updated: true;
  affected: number;
  codes: readonly string[];
};

export type DictItemDeleteMutationRecord = {
  deleted: true;
  affected: number;
  ids: readonly string[];
};

export type DictItemBatchMutationRecord = {
  updated: true;
  affected: number;
  ids: readonly string[];
};

export type DictCacheRefreshRecord = {
  refreshed: true;
  cachedKeys: number;
  refreshedAt: string;
};

export type SystemDictPageQuery = PageQueryInput &
  Pick<
    DictTypeQueryDto,
    'code' | 'createdFrom' | 'createdTo' | 'enabled' | 'name'
  >;
export type SystemDictItemPageQuery = PageQueryInput &
  Pick<DictItemQueryDto, 'dictCode' | 'enabled' | 'label' | 'value'>;

export type SystemDictNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export abstract class SystemDictRepository {
  abstract listDicts(
    query?: SystemDictPageQuery,
  ): Promise<PageResult<DictTypeRecord>>;

  abstract listDictItemsPage(
    query?: SystemDictItemPageQuery,
  ): Promise<PageResult<DictItemRecord>>;

  abstract getDict(code: string): Promise<DictTypeRecord>;

  abstract listDictDataOptions(
    query?: DictDataOptionQueryDto,
  ): Promise<readonly DictDataOptionRecord[]>;

  abstract listDictItems(code: string): Promise<readonly DictItemRecord[]>;

  abstract getDictItem(code: string, itemId: string): Promise<DictItemRecord>;

  abstract createDict(body: CreateDictTypeDto): Promise<DictTypeRecord>;

  abstract createDictItem(
    code: string,
    body: CreateDictItemDto,
  ): Promise<DictItemRecord>;

  abstract updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord>;

  abstract updateDictItem(
    code: string,
    itemId: string,
    body: UpdateDictItemDto,
  ): Promise<DictItemRecord>;

  abstract deleteDictItem(
    code: string,
    itemId: string,
  ): Promise<{ deleted: true }>;

  abstract deleteDict(code: string): Promise<{ deleted: true }>;

  abstract deleteDicts(
    body: BatchDeleteDictTypesDto,
  ): Promise<DictDeleteMutationRecord>;

  abstract updateDictStatus(
    body: BatchUpdateDictStatusDto,
  ): Promise<DictBatchMutationRecord>;

  abstract deleteDictItems(
    body: BatchDeleteDictItemsDto,
  ): Promise<DictItemDeleteMutationRecord>;

  abstract updateDictItemStatus(
    body: BatchUpdateDictItemStatusDto,
  ): Promise<DictItemBatchMutationRecord>;

  abstract refreshDictCache(): Promise<DictCacheRefreshRecord>;
}

export function normalizeSystemDictPageQuery(
  query: SystemDictPageQuery = {},
  total: number,
): SystemDictNormalizedPageQuery {
  const pagination = normalizePagination(query, { maxPageSize: 100 });
  const totalPages = Math.ceil(total / pagination.pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(pagination.page, totalPages);

  return {
    page: safePage,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    skip: (safePage - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function createSystemDictPageResult<T>(
  items: readonly T[],
  pagination: SystemDictNormalizedPageQuery,
): PageResult<T> {
  return createPageResult(
    [...items],
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    pagination.total,
  );
}

export function createSystemDictExportPreview(
  page: PageResult<unknown>,
): SystemDictExportPreview {
  return {
    filename: 'opencore-dicts.csv',
    scope: 'current-page',
    columns: ['code', 'name', 'enabled', 'system', 'createdAt', 'updatedAt'],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function createSystemDictItemsExportPreview(
  page: PageResult<unknown>,
): SystemDictExportPreview {
  return {
    filename: 'opencore-dict-items.csv',
    scope: 'current-page',
    columns: [
      'dictCode',
      'label',
      'value',
      'sort',
      'enabled',
      'colorType',
      'cssClass',
      'createdAt',
      'updatedAt',
    ],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function cloneDictType(dict: DictTypeRecord): DictTypeRecord {
  return {
    ...dict,
    items: dict.items.map((item) => ({ ...item })),
  };
}

export type NormalizedDictItemCreateInput = {
  colorType?: string;
  cssClass?: string;
  enabled: boolean;
  id?: string;
  label: string;
  remark?: string;
  sort: number;
  value: string;
};

export type NormalizedDictItemUpdateInput = {
  colorType?: string;
  cssClass?: string;
  enabled?: boolean;
  label?: string;
  remark?: string;
  sort?: number;
  value?: string;
};

export type NormalizedDictTypeCreateInput = {
  code: string;
  description?: string;
  enabled: boolean;
  items: NormalizedDictItemCreateInput[];
  name: string;
  remark?: string;
};

export type NormalizedDictTypeUpdateInput = {
  description?: string;
  enabled?: boolean;
  name?: string;
  remark?: string;
};

export type NormalizedDictTypeFilters = {
  code?: string;
  createdFrom?: Date;
  createdTo?: Date;
  enabled?: boolean;
  name?: string;
};

export type NormalizedDictItemFilters = {
  dictCode?: string;
  enabled?: boolean;
  label?: string;
  value?: string;
};

export function normalizeCreateDictTypeInput(
  body: CreateDictTypeDto,
): NormalizedDictTypeCreateInput {
  const code = normalizeDictCode(body.code);

  return {
    code,
    name: normalizeRequiredText(body.name, 'name'),
    description: normalizeOptionalText(body.description, 'description'),
    remark: normalizeOptionalText(body.remark, 'remark'),
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled') ?? true,
    items: (body.items ?? []).map((item, index) =>
      normalizeCreateDictItemInput(item, index),
    ),
  };
}

export function normalizeUpdateDictTypeInput(
  body: UpdateDictTypeDto,
): NormalizedDictTypeUpdateInput {
  if (body.items !== undefined) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_INLINE_ITEMS_UPDATE_UNSUPPORTED',
      'Dictionary items must be managed through item endpoints.',
      { field: 'items' },
    );
  }

  return {
    name:
      body.name === undefined
        ? undefined
        : normalizeRequiredText(body.name, 'name'),
    description:
      body.description === undefined
        ? undefined
        : normalizeOptionalText(body.description, 'description'),
    remark:
      body.remark === undefined
        ? undefined
        : normalizeOptionalText(body.remark, 'remark'),
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled'),
  };
}

export function normalizeCreateDictItemInput(
  body: CreateDictItemDto,
  index = 0,
): NormalizedDictItemCreateInput {
  return {
    id: normalizeOptionalText(body.id, 'id'),
    label: normalizeRequiredText(body.label, 'label'),
    value: normalizeRequiredText(body.value, 'value'),
    sort: normalizeOptionalInteger(body.sort, 'sort') ?? (index + 1) * 10,
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled') ?? true,
    colorType: normalizeOptionalText(body.colorType, 'colorType'),
    cssClass: normalizeOptionalText(body.cssClass, 'cssClass'),
    remark: normalizeOptionalText(body.remark, 'remark'),
  };
}

export function normalizeUpdateDictItemInput(
  body: UpdateDictItemDto,
): NormalizedDictItemUpdateInput {
  return {
    label:
      body.label === undefined
        ? undefined
        : normalizeRequiredText(body.label, 'label'),
    value:
      body.value === undefined
        ? undefined
        : normalizeRequiredText(body.value, 'value'),
    sort: normalizeOptionalInteger(body.sort, 'sort'),
    enabled: normalizeOptionalBoolean(body.enabled, 'enabled'),
    colorType:
      body.colorType === undefined
        ? undefined
        : normalizeOptionalText(body.colorType, 'colorType'),
    cssClass:
      body.cssClass === undefined
        ? undefined
        : normalizeOptionalText(body.cssClass, 'cssClass'),
    remark:
      body.remark === undefined
        ? undefined
        : normalizeOptionalText(body.remark, 'remark'),
  };
}

export function normalizeDictTypeFilters(
  query: SystemDictPageQuery = {},
): NormalizedDictTypeFilters {
  return {
    code: normalizeOptionalText(query.code, 'code'),
    name: normalizeOptionalText(query.name, 'name'),
    enabled: normalizeOptionalBooleanish(query.enabled, 'enabled'),
    createdFrom: normalizeOptionalDate(query.createdFrom, 'createdFrom'),
    createdTo: normalizeOptionalDate(query.createdTo, 'createdTo'),
  };
}

export function normalizeDictItemFilters(
  query: SystemDictItemPageQuery = {},
): NormalizedDictItemFilters {
  return {
    dictCode: normalizeOptionalText(query.dictCode, 'dictCode'),
    label: normalizeOptionalText(query.label, 'label'),
    value: normalizeOptionalText(query.value, 'value'),
    enabled: normalizeOptionalBooleanish(query.enabled, 'enabled'),
  };
}

export function normalizeDictCodes(
  body: BatchDeleteDictTypesDto | BatchUpdateDictStatusDto,
): readonly string[] {
  if (!Array.isArray(body?.codes)) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_CODES_INVALID',
      'Dictionary codes must be an array.',
      { field: 'codes' },
    );
  }

  if (body.codes.length === 0) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_CODES_EMPTY',
      'Dictionary codes must not be empty.',
      { field: 'codes' },
    );
  }

  const codes = body.codes.map(normalizeDictCode);
  const duplicate = findFirstDuplicate(codes);

  if (duplicate) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_CODE_DUPLICATED',
      `Dictionary code is duplicated: ${duplicate}`,
      { duplicate },
    );
  }

  return [...codes].sort();
}

export function normalizeDictItemIds(
  body: BatchDeleteDictItemsDto | BatchUpdateDictItemStatusDto,
): readonly string[] {
  if (!Array.isArray(body?.ids)) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_ITEM_IDS_INVALID',
      'Dictionary item ids must be an array.',
      { field: 'ids' },
    );
  }

  if (body.ids.length === 0) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_ITEM_IDS_EMPTY',
      'Dictionary item ids must not be empty.',
      { field: 'ids' },
    );
  }

  const ids = body.ids.map((id) => normalizeRequiredText(id, 'id'));
  const duplicate = findFirstDuplicate(ids);

  if (duplicate) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_ITEM_ID_DUPLICATED',
      `Dictionary item id is duplicated: ${duplicate}`,
      { duplicate },
    );
  }

  return [...ids].sort();
}

export function normalizeBatchEnabled(value: unknown): boolean {
  return normalizeOptionalBoolean(value, 'enabled') ?? true;
}

export function normalizeOptionalBoolean(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw systemDictBadRequest(
      'SYSTEM_DICT_BOOLEAN_INVALID',
      `${fieldName} must be a boolean.`,
      { field: fieldName },
    );
  }

  return value;
}

function normalizeOptionalBooleanish(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return normalizeOptionalBoolean(value, fieldName);
}

function normalizeDictCode(value: unknown): string {
  const code = normalizeRequiredText(value, 'code');
  if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(code)) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_CODE_INVALID',
      'Dictionary code is invalid.',
      { field: 'code' },
    );
  }
  return code;
}

function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_TEXT_REQUIRED',
      `${fieldName} must be a non-empty string.`,
      { field: fieldName },
    );
  }

  return value.trim();
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return normalizeRequiredText(value, fieldName);
}

function normalizeOptionalDate(
  value: unknown,
  fieldName: string,
): Date | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw systemDictBadRequest(
      'SYSTEM_DICT_DATE_INVALID',
      `${fieldName} must be an ISO date string.`,
      { field: fieldName },
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_DATE_INVALID',
      `${fieldName} must be an ISO date string.`,
      { field: fieldName },
    );
  }

  return date;
}

function normalizeOptionalInteger(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_INTEGER_INVALID',
      `${fieldName} must be an integer.`,
      { field: fieldName },
    );
  }

  return value;
}

export function systemDictBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemDictConflict(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConflictException {
  return new ConflictException(createApiErrorBody({ code, message, details }));
}

export function systemDictNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

function findFirstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }
  return undefined;
}
