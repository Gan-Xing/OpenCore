import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  BatchDeleteDictItemsDto,
  BatchDeleteDictTypesDto,
  BatchUpdateDictItemStatusDto,
  BatchUpdateDictStatusDto,
  CreateDictItemDto,
  CreateDictTypeDto,
  DictDataOptionQueryDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
} from './system-dict.dto';
import {
  seedDictTypes,
  type DictDataOptionRecord,
  type DictItemRecord,
  type DictTypeRecord,
} from './system-dict.records';
import {
  cloneDictType,
  createSystemDictPageResult,
  normalizeSystemDictPageQuery,
  normalizeCreateDictItemInput,
  systemDictConflict,
  systemDictNotFound,
  normalizeUpdateDictItemInput,
  normalizeCreateDictTypeInput,
  normalizeDictCodes,
  normalizeDictItemFilters,
  normalizeDictItemIds,
  normalizeDictTypeFilters,
  normalizeUpdateDictTypeInput,
  normalizeBatchEnabled,
  systemDictBadRequest,
  SystemDictRepository,
  type DictBatchMutationRecord,
  type DictCacheRefreshRecord,
  type DictDeleteMutationRecord,
  type DictItemBatchMutationRecord,
  type DictItemDeleteMutationRecord,
  type SystemDictItemPageQuery,
  type SystemDictPageQuery,
} from './system-dict.repository';
@Injectable()
export class SeedSystemDictRepository extends SystemDictRepository {
  private dictTypes = seedDictTypes.map(cloneDictType);

  async listDicts(
    query: SystemDictPageQuery = {},
  ): Promise<PageResult<DictTypeRecord>> {
    const filters = normalizeDictTypeFilters(query);
    const filtered = this.dictTypes.filter((dict) => {
      const createdAt = new Date(dict.createdAt);
      return (
        (!filters.code || dict.code.includes(filters.code)) &&
        (!filters.name || dict.name.includes(filters.name)) &&
        (filters.enabled === undefined || dict.enabled === filters.enabled) &&
        (!filters.createdFrom || createdAt >= filters.createdFrom) &&
        (!filters.createdTo || createdAt <= filters.createdTo)
      );
    });
    const pagination = normalizeSystemDictPageQuery(query, filtered.length);
    const rows = filtered.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return createSystemDictPageResult(rows.map(cloneDictType), pagination);
  }

  async listDictItemsPage(
    query: SystemDictItemPageQuery = {},
  ): Promise<PageResult<DictItemRecord>> {
    const filters = normalizeDictItemFilters(query);
    const filtered = this.dictTypes
      .flatMap((dict) => dict.items)
      .filter(
        (item) =>
          (!filters.dictCode || item.dictCode === filters.dictCode) &&
          (!filters.label || item.label.includes(filters.label)) &&
          (!filters.value || item.value.includes(filters.value)) &&
          (filters.enabled === undefined || item.enabled === filters.enabled),
      )
      .sort(compareDictDataOptions);
    const pagination = normalizeSystemDictPageQuery(query, filtered.length);
    return createSystemDictPageResult(
      filtered
        .slice(pagination.skip, pagination.skip + pagination.take)
        .map((item) => ({ ...item })),
      pagination,
    );
  }

  async getDict(code: string): Promise<DictTypeRecord> {
    return cloneDictType(this.findDict(code));
  }

  async listDictDataOptions(
    query: DictDataOptionQueryDto = {},
  ): Promise<readonly DictDataOptionRecord[]> {
    return this.dictTypes
      .filter((dict) => dict.enabled)
      .filter((dict) => !query.dictCode || dict.code === query.dictCode)
      .flatMap((dict) =>
        dict.items
          .filter((item) => item.enabled)
          .map((item) => ({
            ...item,
            dictCode: dict.code,
          })),
      )
      .sort(compareDictDataOptions);
  }

  async listDictItems(code: string): Promise<readonly DictItemRecord[]> {
    return this.findDict(code).items.map((item) => ({ ...item }));
  }

  async getDictItem(code: string, itemId: string): Promise<DictItemRecord> {
    return { ...this.findDictItem(code, itemId).item };
  }

  async createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    const input = normalizeCreateDictTypeInput(body);
    assertNoDuplicateItemValues(input.items.map((item) => item.value));
    if (this.dictTypes.some((dict) => dict.code === input.code)) {
      throw systemDictConflict(
        'SYSTEM_DICT_ALREADY_EXISTS',
        'Dictionary already exists.',
        { code: input.code },
      );
    }
    const now = new Date().toISOString();

    const dict: DictTypeRecord = {
      id: `dict_${input.code.replaceAll('.', '_')}`,
      code: input.code,
      name: input.name,
      description: input.description,
      remark: input.remark,
      enabled: input.enabled,
      system: false,
      createdAt: now,
      updatedAt: now,
      items: input.items.map((item, index) => ({
        ...item,
        dictCode: input.code,
        id: item.id ?? createDictItemId(input.code, item.value, index),
        createdAt: now,
        updatedAt: now,
      })),
    };
    this.dictTypes = [dict, ...this.dictTypes];
    return cloneDictType(dict);
  }

  async createDictItem(
    code: string,
    body: CreateDictItemDto,
  ): Promise<DictItemRecord> {
    const dict = this.findDict(code);
    const input = normalizeCreateDictItemInput(body, dict.items.length);
    this.assertItemValueAvailable(dict, input.value);
    const now = new Date().toISOString();
    const item = {
      ...input,
      dictCode: code,
      id: input.id ?? createDictItemId(code, input.value, dict.items.length),
      createdAt: now,
      updatedAt: now,
    };

    dict.items = sortItems([...dict.items, item]);
    return { ...item };
  }

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const dict = this.findDict(code);
    const input = normalizeUpdateDictTypeInput(body);
    if (dict.system && input.enabled === false) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_IMMUTABLE',
        'System built-in dictionary cannot be disabled.',
        { code },
      );
    }
    Object.assign(dict, {
      name: input.name ?? dict.name,
      description: input.description ?? dict.description,
      remark: input.remark ?? dict.remark,
      enabled: input.enabled ?? dict.enabled,
      updatedAt: new Date().toISOString(),
    });
    return cloneDictType(dict);
  }

  async updateDictItem(
    code: string,
    itemId: string,
    body: UpdateDictItemDto,
  ): Promise<DictItemRecord> {
    const { dict, item } = this.findDictItem(code, itemId);
    const input = normalizeUpdateDictItemInput(body);

    if (
      dict.system &&
      (input.enabled === false ||
        (input.value !== undefined && input.value !== item.value))
    ) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item value and status cannot be changed.',
        { itemId },
      );
    }

    if (input.value && input.value !== item.value) {
      this.assertItemValueAvailable(dict, input.value);
    }

    Object.assign(item, {
      label: input.label ?? item.label,
      value: input.value ?? item.value,
      sort: input.sort ?? item.sort,
      enabled: input.enabled ?? item.enabled,
      colorType: input.colorType ?? item.colorType,
      cssClass: input.cssClass ?? item.cssClass,
      remark: input.remark ?? item.remark,
      updatedAt: new Date().toISOString(),
    });
    dict.items = sortItems(dict.items);
    return { ...item };
  }

  async deleteDictItem(
    code: string,
    itemId: string,
  ): Promise<{ deleted: true }> {
    const { dict } = this.findDictItem(code, itemId);
    if (dict.system) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item cannot be deleted.',
        { itemId },
      );
    }
    dict.items = dict.items.filter((item) => item.id !== itemId);
    return { deleted: true };
  }

  async deleteDict(code: string): Promise<{ deleted: true }> {
    const dict = this.findDict(code);
    assertDictCanBeDeleted(dict);
    this.dictTypes = this.dictTypes.filter((dict) => dict.code !== code);
    return { deleted: true };
  }

  async deleteDicts(
    body: BatchDeleteDictTypesDto,
  ): Promise<DictDeleteMutationRecord> {
    const codes = normalizeDictCodes(body);
    const dicts = codes.map((code) => this.findDict(code));
    const systemDict = dicts.find((dict) => dict.system);
    if (systemDict) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_IMMUTABLE',
        'System built-in dictionary cannot be deleted.',
        { code: systemDict.code },
      );
    }
    const dictWithItems = dicts.find((dict) => dict.items.length > 0);
    if (dictWithItems) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_HAS_ITEMS',
        'Dictionary has items and cannot be deleted.',
        { code: dictWithItems.code },
      );
    }
    this.dictTypes = this.dictTypes.filter((dict) => !codes.includes(dict.code));
    return { deleted: true, affected: codes.length, codes };
  }

  async updateDictStatus(
    body: BatchUpdateDictStatusDto,
  ): Promise<DictBatchMutationRecord> {
    const codes = normalizeDictCodes(body);
    const enabled = normalizeBatchEnabled(body.enabled);
    const dicts = codes.map((code) => this.findDict(code));
    const systemDict = !enabled && dicts.find((dict) => dict.system);
    if (systemDict) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_IMMUTABLE',
        'System built-in dictionary cannot be disabled.',
        { code: systemDict.code },
      );
    }
    const now = new Date().toISOString();
    dicts.forEach((dict) => {
      dict.enabled = enabled;
      dict.updatedAt = now;
    });
    return { updated: true, affected: codes.length, codes };
  }

  async deleteDictItems(
    body: BatchDeleteDictItemsDto,
  ): Promise<DictItemDeleteMutationRecord> {
    const ids = normalizeDictItemIds(body);
    const matches = ids.map((id) => this.findDictItemByGlobalId(id));
    const systemItem = matches.find(({ dict }) => dict.system);
    if (systemItem) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item cannot be deleted.',
        { itemId: systemItem.item.id },
      );
    }
    matches.forEach(({ dict, item }) => {
      dict.items = dict.items.filter((candidate) => candidate.id !== item.id);
    });
    return { deleted: true, affected: ids.length, ids };
  }

  async updateDictItemStatus(
    body: BatchUpdateDictItemStatusDto,
  ): Promise<DictItemBatchMutationRecord> {
    const ids = normalizeDictItemIds(body);
    const enabled = normalizeBatchEnabled(body.enabled);
    const matches = ids.map((id) => this.findDictItemByGlobalId(id));
    const systemItem = !enabled && matches.find(({ dict }) => dict.system);
    if (systemItem) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item cannot be disabled.',
        { itemId: systemItem.item.id },
      );
    }
    const now = new Date().toISOString();
    matches.forEach(({ item }) => {
      item.enabled = enabled;
      item.updatedAt = now;
    });
    return { updated: true, affected: ids.length, ids };
  }

  async refreshDictCache(): Promise<DictCacheRefreshRecord> {
    return {
      refreshed: true,
      cachedKeys: this.dictTypes.filter((dict) => dict.enabled).length,
      refreshedAt: new Date().toISOString(),
    };
  }

  private findDict(code: string): DictTypeRecord {
    const dict = this.dictTypes.find((candidate) => candidate.code === code);

    if (!dict) {
      throw systemDictNotFound(
        'SYSTEM_DICT_NOT_FOUND',
        'Dictionary not found.',
        {
          code,
        },
      );
    }

    return dict;
  }

  private findDictItem(
    code: string,
    itemId: string,
  ): { dict: DictTypeRecord; item: DictItemRecord } {
    const dict = this.findDict(code);
    const item = dict.items.find((candidate) => candidate.id === itemId);

    if (!item) {
      throw systemDictNotFound(
        'SYSTEM_DICT_ITEM_NOT_FOUND',
        'Dictionary item not found.',
        { itemId },
      );
    }

    return { dict, item };
  }

  private findDictItemByGlobalId(itemId: string): {
    dict: DictTypeRecord;
    item: DictItemRecord;
  } {
    for (const dict of this.dictTypes) {
      const item = dict.items.find((candidate) => candidate.id === itemId);
      if (item) {
        return { dict, item };
      }
    }

    throw systemDictNotFound(
      'SYSTEM_DICT_ITEM_NOT_FOUND',
      'Dictionary item not found.',
      { itemId },
    );
  }

  private assertItemValueAvailable(dict: DictTypeRecord, value: string): void {
    if (dict.items.some((item) => item.value === value)) {
      throw systemDictConflict(
        'SYSTEM_DICT_ITEM_ALREADY_EXISTS',
        'Dictionary item already exists.',
        { value },
      );
    }
  }
}

function assertDictCanBeDeleted(dict: DictTypeRecord): void {
  if (dict.system) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_SYSTEM_IMMUTABLE',
      'System built-in dictionary cannot be deleted.',
      { code: dict.code },
    );
  }
  if (dict.items.length > 0) {
    throw systemDictBadRequest(
      'SYSTEM_DICT_HAS_ITEMS',
      'Dictionary has items and cannot be deleted.',
      { code: dict.code },
    );
  }
}

function assertNoDuplicateItemValues(values: readonly string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw systemDictConflict(
        'SYSTEM_DICT_ITEM_ALREADY_EXISTS',
        'Dictionary item already exists.',
        { value },
      );
    }
    seen.add(value);
  }
}

function sortItems(items: readonly DictItemRecord[]): DictItemRecord[] {
  return [...items].sort(
    (left, right) =>
      left.sort - right.sort || left.value.localeCompare(right.value),
  );
}

function createDictItemId(code: string, value: string, index: number): string {
  return `dict_item_${createIdPart(code)}_${createIdPart(value) || index + 1}`;
}

function createIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function compareDictDataOptions(
  left: DictDataOptionRecord,
  right: DictDataOptionRecord,
): number {
  return (
    left.dictCode.localeCompare(right.dictCode) ||
    left.sort - right.sort ||
    left.value.localeCompare(right.value)
  );
}
