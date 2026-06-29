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
import { unzipSync } from 'fflate';
import {
  createOpenCoreXlsxWorkbookBase64,
  OPENCORE_XLSX_CONTENT_TYPE,
} from '../export-xlsx';
import type {
  BatchDeleteDictItemsDto,
  BatchDeleteDictTypesDto,
  BatchUpdateDictItemStatusDto,
  BatchUpdateDictStatusDto,
  CreateDictItemDto,
  CreateDictTypeDto,
  DictDataOptionQueryDto,
  DictItemQueryDto,
  ImportDictsDto,
  TranslateDictValuesDto,
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

export type SystemDictImportTemplateRecord = {
  filename: string;
  contentType: string;
  contentBase64: string;
  columns: readonly string[];
  rowCount: number;
};

export type SystemDictImportCsvRecord = {
  rowNumber: number;
  values: Record<string, string>;
};

export type NormalizedSystemDictImportInput = {
  rowNumber: number;
  dictCode: string;
  dictName: string;
  dictDescription?: string;
  dictRemark?: string;
  dictEnabled: boolean;
  itemValue?: string;
  itemLabel?: string;
  itemSort?: number;
  itemEnabled?: boolean;
  itemColorType?: string;
  itemCssClass?: string;
  itemRemark?: string;
};

export type SystemDictImportFailureRecord = {
  rowNumber: number;
  dictCode?: string;
  itemValue?: string;
  reason: string;
};

export type SystemDictImportResultRecord = {
  dryRun: boolean;
  totalRows: number;
  createdDicts: number;
  updatedDicts: number;
  createdItems: number;
  updatedItems: number;
  failed: number;
  createdDictCodes: readonly string[];
  updatedDictCodes: readonly string[];
  createdItemRefs: readonly string[];
  updatedItemRefs: readonly string[];
  failures: readonly SystemDictImportFailureRecord[];
};

export type NormalizedDictTranslationEntry = {
  dictCode: string;
  values: readonly string[];
};

export type DictTranslationItemRecord = {
  dictCode: string;
  value: string;
  found: boolean;
  label?: string;
  colorType?: string;
  cssClass?: string;
  enabled?: boolean;
};

export type DictTranslationResultRecord = {
  items: readonly DictTranslationItemRecord[];
  translatedAt: string;
};

export const SYSTEM_DICT_XLSX_CONTENT_TYPE = OPENCORE_XLSX_CONTENT_TYPE;
export const SYSTEM_DICT_IMPORT_COLUMNS = [
  'dictCode',
  'dictName',
  'dictDescription',
  'dictRemark',
  'dictEnabled',
  'itemValue',
  'itemLabel',
  'itemSort',
  'itemEnabled',
  'itemColorType',
  'itemCssClass',
  'itemRemark',
] as const;
const DICT_IMPORT_MAX_BYTES = 512 * 1024;

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

  abstract listDeletedDicts(
    query?: SystemDictPageQuery,
  ): Promise<PageResult<DictTypeRecord>>;

  abstract listDeletedDictItemsPage(
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

  abstract restoreDict(code: string): Promise<DictTypeRecord>;

  abstract restoreDictItem(itemId: string): Promise<DictItemRecord>;

  abstract hardDeleteDict(code: string): Promise<{ deleted: true }>;

  abstract hardDeleteDictItem(itemId: string): Promise<{ deleted: true }>;

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
    columns: [
      'tenantId',
      'code',
      'name',
      'enabled',
      'system',
      'createdAt',
      'updatedAt',
    ],
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
      'tenantId',
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

export function createSystemDictImportTemplate(): SystemDictImportTemplateRecord {
  const rows: readonly (readonly string[])[] = [
    SYSTEM_DICT_IMPORT_COLUMNS,
    [
      'system.example.priority',
      'Example Priority',
      'Example dictionary imported from template.',
      'Replace this row before production import.',
      'true',
      'high',
      'High',
      '10',
      'true',
      'error',
      '',
      'High priority label',
    ],
    [
      'system.example.priority',
      'Example Priority',
      'Example dictionary imported from template.',
      'Replace this row before production import.',
      'true',
      'normal',
      'Normal',
      '20',
      'true',
      'processing',
      '',
      'Normal priority label',
    ],
  ];

  return {
    filename: 'opencore-system-dicts-import-template.xlsx',
    contentType: SYSTEM_DICT_XLSX_CONTENT_TYPE,
    contentBase64: createOpenCoreXlsxWorkbookBase64({
      worksheetRows: rows,
      generatedAt: new Date().toISOString(),
      sheetName: 'Dictionaries',
    }),
    columns: SYSTEM_DICT_IMPORT_COLUMNS,
    rowCount: rows.length - 1,
  };
}

export function parseSystemDictImport(
  body: ImportDictsDto,
): readonly SystemDictImportCsvRecord[] {
  const content = decodeSystemDictImportContent(body);
  const isXlsx = isXlsxContent(content);
  const rows = isXlsx
    ? parseXlsxRows(content)
    : parseCsvRows(stripUtf8Bom(content.toString('utf8')));
  const label = isXlsx ? 'XLSX' : 'CSV';

  if (rows.length < 2) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_ROWS_REQUIRED',
      `System dictionary import ${label} must contain a header and at least one data row.`,
      { format: label },
    );
  }

  const headers = rows[0].map((header) => header.trim());
  const missingHeader = SYSTEM_DICT_IMPORT_COLUMNS.find(
    (column) => !headers.includes(column),
  );

  if (missingHeader) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_COLUMN_MISSING',
      `System dictionary import ${label} is missing column: ${missingHeader}`,
      { column: missingHeader, format: label },
    );
  }

  const records = rows
    .slice(1)
    .map((cells, index) => {
      const values: Record<string, string> = {};

      for (const column of SYSTEM_DICT_IMPORT_COLUMNS) {
        const columnIndex = headers.indexOf(column);
        values[column] = cells[columnIndex]?.trim() ?? '';
      }

      return {
        rowNumber: index + 2,
        values,
      };
    })
    .filter((record) =>
      SYSTEM_DICT_IMPORT_COLUMNS.some((column) => record.values[column]),
    );

  if (records.length === 0) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_DATA_ROW_REQUIRED',
      `System dictionary import ${label} must contain at least one non-empty data row.`,
      { format: label },
    );
  }

  return records;
}

export function normalizeSystemDictImportRecord(
  record: SystemDictImportCsvRecord,
): NormalizedSystemDictImportInput {
  const itemValue = normalizeOptionalText(record.values.itemValue, 'itemValue');
  const itemLabel = normalizeOptionalText(record.values.itemLabel, 'itemLabel');

  if ((itemValue && !itemLabel) || (!itemValue && itemLabel)) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_ITEM_PAIR_INVALID',
      'Dictionary import itemValue and itemLabel must be provided together.',
      { rowNumber: record.rowNumber },
    );
  }

  return {
    rowNumber: record.rowNumber,
    dictCode: normalizeDictCode(record.values.dictCode),
    dictName: normalizeRequiredText(record.values.dictName, 'dictName'),
    dictDescription: normalizeOptionalText(
      record.values.dictDescription,
      'dictDescription',
    ),
    dictRemark: normalizeOptionalText(record.values.dictRemark, 'dictRemark'),
    dictEnabled: normalizeImportBoolean(record.values.dictEnabled, true),
    itemValue,
    itemLabel,
    itemSort: normalizeOptionalImportInteger(
      record.values.itemSort,
      'itemSort',
    ),
    itemEnabled:
      itemValue === undefined
        ? undefined
        : normalizeImportBoolean(record.values.itemEnabled, true),
    itemColorType: normalizeOptionalText(
      record.values.itemColorType,
      'itemColorType',
    ),
    itemCssClass: normalizeOptionalText(
      record.values.itemCssClass,
      'itemCssClass',
    ),
    itemRemark: normalizeOptionalText(record.values.itemRemark, 'itemRemark'),
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

export function normalizeDictCode(value: unknown): string {
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

export function normalizeRequiredText(
  value: unknown,
  fieldName: string,
): string {
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

function normalizeOptionalImportInteger(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed)) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_INTEGER_INVALID',
      `${fieldName} must be an integer.`,
      { field: fieldName },
    );
  }

  return parsed;
}

export function normalizeImportUpdateExisting(value: unknown): boolean {
  return normalizeOptionalBoolean(value, 'updateExisting') ?? false;
}

export function normalizeDictTranslationEntries(
  body: TranslateDictValuesDto,
): readonly NormalizedDictTranslationEntry[] {
  if (!Array.isArray(body?.entries)) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_TRANSLATION_ENTRIES_INVALID',
      'Dictionary translation entries must be an array.',
      { field: 'entries' },
    );
  }

  if (body.entries.length === 0) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_TRANSLATION_ENTRIES_EMPTY',
      'Dictionary translation entries must not be empty.',
      { field: 'entries' },
    );
  }

  return body.entries.map((entry, index) => {
    const dictCode = normalizeDictCode(entry?.dictCode);

    if (!Array.isArray(entry?.values)) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_TRANSLATION_VALUES_INVALID',
        'Dictionary translation values must be an array.',
        { field: `entries.${index}.values`, dictCode },
      );
    }

    const values = entry.values.map((value: unknown) =>
      normalizeRequiredText(value, 'value'),
    );
    const duplicate = findFirstDuplicate(values);

    if (duplicate) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_TRANSLATION_VALUE_DUPLICATED',
        `Dictionary translation value is duplicated: ${duplicate}`,
        { duplicate, dictCode },
      );
    }

    return { dictCode, values };
  });
}

function normalizeImportBoolean(value: string, fallback: boolean): boolean {
  if (value === '') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'enabled', '启用'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'disabled', '停用'].includes(normalized)) {
    return false;
  }

  throw systemDictBadRequest(
    'SYSTEM_DICT_IMPORT_BOOLEAN_INVALID',
    'Dictionary import boolean value is invalid.',
    { value },
  );
}

function decodeSystemDictImportContent(body: ImportDictsDto): Buffer {
  const contentBase64 = normalizeRequiredText(
    body?.contentBase64,
    'import contentBase64',
  );
  const normalizedBase64 = contentBase64.includes(',')
    ? contentBase64.slice(contentBase64.indexOf(',') + 1)
    : contentBase64;
  const trimmedBase64 = normalizedBase64.trim();

  if (
    trimmedBase64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(trimmedBase64)
  ) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_CONTENT_BASE64_INVALID',
      'System dictionary import content must be base64.',
      { field: 'contentBase64' },
    );
  }

  const content = Buffer.from(trimmedBase64, 'base64');
  const canonical = content.toString('base64');

  if (
    content.byteLength === 0 ||
    canonical.replace(/=+$/, '') !== trimmedBase64.replace(/=+$/, '')
  ) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_CONTENT_EMPTY',
      'System dictionary import content must not be empty.',
      { field: 'contentBase64' },
    );
  }

  if (content.byteLength > DICT_IMPORT_MAX_BYTES) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_CONTENT_TOO_LARGE',
      `System dictionary import content must not exceed ${DICT_IMPORT_MAX_BYTES} bytes.`,
      { maxBytes: DICT_IMPORT_MAX_BYTES },
    );
  }

  return content;
}

function isXlsxContent(content: Buffer): boolean {
  return content[0] === 0x50 && content[1] === 0x4b;
}

function parseXlsxRows(content: Buffer): string[][] {
  let files: Record<string, Uint8Array>;

  try {
    files = unzipSync(new Uint8Array(content));
  } catch {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_XLSX_INVALID',
      'System dictionary import XLSX must be a valid workbook.',
    );
  }

  const worksheet = files['xl/worksheets/sheet1.xml'];

  if (!worksheet) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_XLSX_SHEET_MISSING',
      'System dictionary import XLSX must contain xl/worksheets/sheet1.xml.',
    );
  }

  return parseXlsxWorksheetRows(
    Buffer.from(worksheet).toString('utf8'),
    parseXlsxSharedStrings(files['xl/sharedStrings.xml']),
  );
}

function parseXlsxSharedStrings(sharedStrings?: Uint8Array): readonly string[] {
  if (!sharedStrings) {
    return [];
  }

  const xml = Buffer.from(sharedStrings).toString('utf8');
  const values: string[] = [];
  const stringPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let match: RegExpExecArray | null;

  while ((match = stringPattern.exec(xml))) {
    values.push(readXlsxTextNodes(match[1]));
  }

  return values;
}

function parseXlsxWorksheetRows(
  worksheetXml: string,
  sharedStrings: readonly string[],
): string[][] {
  const rows: string[][] = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(worksheetXml))) {
    const cells: string[] = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
    let cellMatch: RegExpExecArray | null;
    let fallbackIndex = 0;

    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      const columnIndex = getXlsxCellColumnIndex(cellMatch[1], fallbackIndex);
      cells[columnIndex] = parseXlsxCellValue(
        cellMatch[1],
        cellMatch[2],
        sharedStrings,
      );
      fallbackIndex = columnIndex + 1;
    }

    rows.push(cells.map((cell) => cell ?? ''));
  }

  return rows.filter((row) => row.some((cell) => cell.trim()));
}

function getXlsxCellColumnIndex(attrs: string, fallbackIndex: number): number {
  const reference = getXmlAttribute(attrs, 'r');
  const match = reference ? /^([A-Z]+)\d+$/i.exec(reference) : undefined;

  return match ? columnNameToIndex(match[1]) : fallbackIndex;
}

function parseXlsxCellValue(
  attrs: string,
  body: string,
  sharedStrings: readonly string[],
): string {
  const cellType = getXmlAttribute(attrs, 't');

  if (cellType === 'inlineStr') {
    return readXlsxTextNodes(body);
  }

  const rawValue = readXmlElementText(body, 'v');

  if (cellType === 's') {
    const sharedStringIndex =
      rawValue === undefined ? Number.NaN : Number.parseInt(rawValue, 10);
    return Number.isInteger(sharedStringIndex)
      ? (sharedStrings[sharedStringIndex] ?? '')
      : '';
  }

  if (cellType === 'b') {
    if (rawValue === '1') {
      return 'true';
    }

    if (rawValue === '0') {
      return 'false';
    }
  }

  if (rawValue !== undefined) {
    return rawValue;
  }

  return readXlsxTextNodes(body);
}

function readXlsxTextNodes(xml: string): string {
  const values: string[] = [];
  const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml))) {
    values.push(unescapeXml(match[1]));
  }

  return values.join('');
}

function readXmlElementText(xml: string, name: string): string | undefined {
  const pattern = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i');
  const match = pattern.exec(xml);

  return match ? unescapeXml(match[1]) : undefined;
}

function getXmlAttribute(attrs: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}="([^"]*)"`, 'i');
  const match = pattern.exec(attrs);

  return match ? unescapeXml(match[1]) : undefined;
}

function columnNameToIndex(name: string): number {
  let index = 0;

  for (const char of name.toUpperCase()) {
    index = index * 26 + char.charCodeAt(0) - 64;
  }

  return Math.max(index - 1, 0);
}

function unescapeXml(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|quot|apos|lt|gt|amp);/gi,
    (_entity, code: string) => {
      const normalizedCode = code.toLowerCase();

      switch (normalizedCode) {
        case 'quot':
          return '"';
        case 'apos':
          return "'";
        case 'lt':
          return '<';
        case 'gt':
          return '>';
        case 'amp':
          return '&';
        default:
          if (normalizedCode.startsWith('#x')) {
            return String.fromCodePoint(
              Number.parseInt(normalizedCode.slice(2), 16),
            );
          }

          return String.fromCodePoint(
            Number.parseInt(normalizedCode.slice(1), 10),
          );
      }
    },
  );
}

function stripUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';

      if (char === '\r' && next === '\n') {
        index += 1;
      }

      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_IMPORT_CSV_UNCLOSED_QUOTE',
      'System dictionary import CSV has an unclosed quote.',
    );
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((candidate) =>
    candidate.some((candidateCell) => candidateCell.trim()),
  );
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
