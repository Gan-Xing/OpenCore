import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
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
  normalizeOptionalBoolean,
  systemDictConflict,
  systemDictNotFound,
  normalizeUpdateDictItemInput,
  SystemDictRepository,
  type SystemDictPageQuery,
} from './system-dict.repository';
@Injectable()
export class SeedSystemDictRepository extends SystemDictRepository {
  private dictTypes = seedDictTypes.map(cloneDictType);

  async listDicts(
    query: SystemDictPageQuery = {},
  ): Promise<PageResult<DictTypeRecord>> {
    const pagination = normalizeSystemDictPageQuery(
      query,
      this.dictTypes.length,
    );
    const rows = this.dictTypes.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return createSystemDictPageResult(rows.map(cloneDictType), pagination);
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
    if (this.dictTypes.some((dict) => dict.code === body.code)) {
      throw systemDictConflict(
        'SYSTEM_DICT_ALREADY_EXISTS',
        'Dictionary already exists.',
        { code: body.code },
      );
    }
    const normalizedItems = (body.items ?? []).map((item, index) =>
      normalizeCreateDictItemInput(item, index),
    );

    const dict: DictTypeRecord = {
      id: `dict_${body.code.replaceAll('.', '_')}`,
      code: body.code,
      name: body.name,
      description: body.description,
      enabled: normalizeOptionalBoolean(body.enabled, 'enabled') ?? true,
      items: normalizedItems.map((item, index) => ({
        ...item,
        id: item.id ?? createDictItemId(body.code, item.value, index),
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
    const item = {
      ...input,
      id: input.id ?? createDictItemId(code, input.value, dict.items.length),
    };

    dict.items = sortItems([...dict.items, item]);
    return { ...item };
  }

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const dict = this.findDict(code);
    const normalizedItems = body.items?.map((item, index) =>
      normalizeCreateDictItemInput(item, index),
    );
    Object.assign(dict, {
      name: body.name ?? dict.name,
      description: body.description ?? dict.description,
      enabled:
        normalizeOptionalBoolean(body.enabled, 'enabled') ?? dict.enabled,
      items: normalizedItems
        ? normalizedItems.map((item, index) => ({
            ...item,
            id: item.id ?? createDictItemId(code, item.value, index),
          }))
        : dict.items,
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

    if (input.value && input.value !== item.value) {
      this.assertItemValueAvailable(dict, input.value);
    }

    Object.assign(item, {
      label: input.label ?? item.label,
      value: input.value ?? item.value,
      sort: input.sort ?? item.sort,
      enabled: input.enabled ?? item.enabled,
    });
    dict.items = sortItems(dict.items);
    return { ...item };
  }

  async deleteDictItem(
    code: string,
    itemId: string,
  ): Promise<{ deleted: true }> {
    const { dict } = this.findDictItem(code, itemId);
    dict.items = dict.items.filter((item) => item.id !== itemId);
    return { deleted: true };
  }

  async deleteDict(code: string): Promise<{ deleted: true }> {
    this.findDict(code);
    this.dictTypes = this.dictTypes.filter((dict) => dict.code !== code);
    return { deleted: true };
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
