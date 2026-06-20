import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
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
import type {
  DictDataOptionRecord,
  DictItemRecord,
  DictTypeRecord,
} from './system-dict.records';
import {
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

type PrismaDictTypeWithItems = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  remark: string | null;
  enabled: boolean;
  system: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: PrismaDictItem[];
};

type PrismaDictItem = {
  id: string;
  typeId?: string;
  type?: {
    code: string;
    deletedAt?: Date | null;
    system?: boolean;
  };
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
  colorType: string | null;
  cssClass: string | null;
  remark: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaDictItemWithType = PrismaDictItem & {
  type: {
    code: string;
    deletedAt?: Date | null;
    enabled: boolean;
    system?: boolean;
  };
};

@Injectable()
export class PrismaSystemDictRepository extends SystemDictRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listDicts(
    query: SystemDictPageQuery = {},
  ): Promise<PageResult<DictTypeRecord>> {
    const filters = normalizeDictTypeFilters(query);
    const where = {
      deletedAt: null,
      ...(filters.code
        ? { code: { contains: filters.code, mode: 'insensitive' as const } }
        : {}),
      ...(filters.name
        ? { name: { contains: filters.name, mode: 'insensitive' as const } }
        : {}),
      ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
      ...(filters.createdFrom || filters.createdTo
        ? {
            createdAt: {
              ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
              ...(filters.createdTo ? { lte: filters.createdTo } : {}),
            },
          }
        : {}),
    };
    const total = await this.prisma.dictType.count({ where });
    const pagination = normalizeSystemDictPageQuery(query, total);
    const rows = await this.prisma.dictType.findMany({
      where,
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { code: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemDictPageResult(rows.map(toDictTypeRecord), pagination);
  }

  async listDictItemsPage(
    query: SystemDictItemPageQuery = {},
  ): Promise<PageResult<DictItemRecord>> {
    const filters = normalizeDictItemFilters(query);
    const where = {
      deletedAt: null,
      ...(filters.dictCode ? { type: { code: filters.dictCode } } : {}),
      ...(filters.label
        ? { label: { contains: filters.label, mode: 'insensitive' as const } }
        : {}),
      ...(filters.value
        ? { value: { contains: filters.value, mode: 'insensitive' as const } }
        : {}),
      ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
    };
    const total = await this.prisma.dictItem.count({ where });
    const pagination = normalizeSystemDictPageQuery(query, total);
    const rows = await this.prisma.dictItem.findMany({
      where,
      include: { type: { select: { code: true, system: true } } },
      orderBy: [{ type: { code: 'asc' } }, { sort: 'asc' }, { value: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemDictPageResult(rows.map(toDictItemRecord), pagination);
  }

  async listDeletedDicts(
    query: SystemDictPageQuery = {},
  ): Promise<PageResult<DictTypeRecord>> {
    const filters = normalizeDictTypeFilters(query);
    const where = {
      deletedAt: { not: null },
      ...(filters.code
        ? { code: { contains: filters.code, mode: 'insensitive' as const } }
        : {}),
      ...(filters.name
        ? { name: { contains: filters.name, mode: 'insensitive' as const } }
        : {}),
      ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
      ...(filters.createdFrom || filters.createdTo
        ? {
            createdAt: {
              ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
              ...(filters.createdTo ? { lte: filters.createdTo } : {}),
            },
          }
        : {}),
    };
    const total = await this.prisma.dictType.count({ where });
    const pagination = normalizeSystemDictPageQuery(query, total);
    const rows = await this.prisma.dictType.findMany({
      where,
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
      orderBy: [{ deletedAt: 'desc' }, { code: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemDictPageResult(rows.map(toDictTypeRecord), pagination);
  }

  async listDeletedDictItemsPage(
    query: SystemDictItemPageQuery = {},
  ): Promise<PageResult<DictItemRecord>> {
    const filters = normalizeDictItemFilters(query);
    const where = {
      deletedAt: { not: null },
      ...(filters.dictCode ? { type: { code: filters.dictCode } } : {}),
      ...(filters.label
        ? { label: { contains: filters.label, mode: 'insensitive' as const } }
        : {}),
      ...(filters.value
        ? { value: { contains: filters.value, mode: 'insensitive' as const } }
        : {}),
      ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
    };
    const total = await this.prisma.dictItem.count({ where });
    const pagination = normalizeSystemDictPageQuery(query, total);
    const rows = await this.prisma.dictItem.findMany({
      where,
      include: { type: { select: { code: true, system: true } } },
      orderBy: [{ deletedAt: 'desc' }, { type: { code: 'asc' } }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemDictPageResult(rows.map(toDictItemRecord), pagination);
  }

  async getDict(code: string): Promise<DictTypeRecord> {
    return toDictTypeRecord(await this.findDictByCode(code));
  }

  async listDictDataOptions(
    query: DictDataOptionQueryDto = {},
  ): Promise<readonly DictDataOptionRecord[]> {
    const rows = await this.prisma.dictItem.findMany({
      where: {
        deletedAt: null,
        enabled: true,
        type: {
          deletedAt: null,
          enabled: true,
          ...(query.dictCode ? { code: query.dictCode } : {}),
        },
      },
      include: {
        type: {
          select: {
            code: true,
            enabled: true,
            system: true,
          },
        },
      },
    });

    return rows.map(toDictDataOptionRecord).sort(compareDictDataOptions);
  }

  async listDictItems(code: string): Promise<readonly DictItemRecord[]> {
    const dict = await this.findDictByCode(code);
    return dict.items.map((item) => toDictItemRecord({ ...item, type: dict }));
  }

  async getDictItem(code: string, itemId: string): Promise<DictItemRecord> {
    return toDictItemRecord(await this.findDictItemById(code, itemId));
  }

  async createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    const input = normalizeCreateDictTypeInput(body);
    assertNoDuplicateItemValues(input.items.map((item) => item.value));
    if (
      await this.prisma.dictType.findUnique({ where: { code: input.code } })
    ) {
      throw systemDictConflict(
        'SYSTEM_DICT_ALREADY_EXISTS',
        'Dictionary already exists.',
        { code: input.code },
      );
    }

    const dict = await this.prisma.dictType.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        remark: input.remark,
        enabled: input.enabled,
        items: {
          create: input.items.map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            label: item.label,
            value: item.value,
            sort: item.sort,
            enabled: item.enabled,
            colorType: item.colorType,
            cssClass: item.cssClass,
            remark: item.remark,
          })),
        },
      },
      include: { items: { orderBy: [{ sort: 'asc' }, { value: 'asc' }] } },
    });

    return toDictTypeRecord(dict);
  }

  async createDictItem(
    code: string,
    body: CreateDictItemDto,
  ): Promise<DictItemRecord> {
    const dict = await this.findDictByCode(code);
    const input = normalizeCreateDictItemInput(body, dict.items.length);
    await this.assertItemValueAvailable(dict.id, input.value);

    const item = await this.prisma.dictItem.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        typeId: dict.id,
        label: input.label,
        value: input.value,
        sort: input.sort,
        enabled: input.enabled,
        colorType: input.colorType,
        cssClass: input.cssClass,
        remark: input.remark,
      },
      include: { type: { select: { code: true, system: true } } },
    });

    return toDictItemRecord(item);
  }

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const existing = await this.findDictByCode(code);
    const input = normalizeUpdateDictTypeInput(body);

    if (existing.system && input.enabled === false) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_IMMUTABLE',
        'System built-in dictionary cannot be disabled.',
        { code },
      );
    }

    const dict = await this.prisma.dictType.update({
      where: { id: existing.id },
      data: {
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        remark: input.remark ?? existing.remark,
        enabled: input.enabled ?? existing.enabled,
      },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
    });

    return toDictTypeRecord(dict);
  }

  async updateDictItem(
    code: string,
    itemId: string,
    body: UpdateDictItemDto,
  ): Promise<DictItemRecord> {
    const existing = await this.findDictItemById(code, itemId);
    const input = normalizeUpdateDictItemInput(body);

    if (
      existing.type?.system &&
      (input.enabled === false ||
        (input.value !== undefined && input.value !== existing.value))
    ) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item value and status cannot be changed.',
        { itemId },
      );
    }

    if (input.value && input.value !== existing.value) {
      await this.assertItemValueAvailable(existing.typeId ?? '', input.value);
    }

    const item = await this.prisma.dictItem.update({
      where: { id: itemId },
      data: {
        label: input.label ?? existing.label,
        value: input.value ?? existing.value,
        sort: input.sort ?? existing.sort,
        enabled: input.enabled ?? existing.enabled,
        colorType: input.colorType ?? existing.colorType,
        cssClass: input.cssClass ?? existing.cssClass,
        remark: input.remark ?? existing.remark,
      },
      include: { type: { select: { code: true, system: true } } },
    });

    return toDictItemRecord(item);
  }

  async deleteDictItem(
    code: string,
    itemId: string,
  ): Promise<{ deleted: true }> {
    const item = await this.findDictItemById(code, itemId);
    if (item.type?.system) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item cannot be deleted.',
        { itemId },
      );
    }
    await this.prisma.dictItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async deleteDict(code: string): Promise<{ deleted: true }> {
    const dict = await this.findDictByCode(code);
    assertDictCanBeDeleted(dict);
    await this.prisma.dictType.update({
      where: { id: dict.id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async restoreDict(code: string): Promise<DictTypeRecord> {
    const dict = await this.findDeletedDictByCode(code);
    const restored = await this.prisma.dictType.update({
      where: { id: dict.id },
      data: { deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
    });

    return toDictTypeRecord(restored);
  }

  async restoreDictItem(itemId: string): Promise<DictItemRecord> {
    const item = await this.findDeletedDictItemById(itemId);
    if (item.type?.deletedAt) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_PARENT_DELETED',
        'Dictionary item cannot be restored while its dictionary is deleted.',
        { itemId, dictCode: item.type.code },
      );
    }

    const restored = await this.prisma.dictItem.update({
      where: { id: itemId },
      data: { deletedAt: null },
      include: { type: { select: { code: true, system: true } } },
    });

    return toDictItemRecord(restored);
  }

  async hardDeleteDict(code: string): Promise<{ deleted: true }> {
    const dict = await this.findDeletedDictByCode(code);
    if (dict.items.length > 0) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_HAS_ITEMS',
        'Dictionary has items and cannot be permanently deleted.',
        { code },
      );
    }

    await this.prisma.dictType.delete({ where: { id: dict.id } });
    return { deleted: true };
  }

  async hardDeleteDictItem(itemId: string): Promise<{ deleted: true }> {
    const item = await this.findDeletedDictItemById(itemId);
    await this.prisma.dictItem.delete({ where: { id: item.id } });
    return { deleted: true };
  }

  async deleteDicts(
    body: BatchDeleteDictTypesDto,
  ): Promise<DictDeleteMutationRecord> {
    const codes = normalizeDictCodes(body);
    const dicts = await this.prisma.dictType.findMany({
      where: { code: { in: [...codes] }, deletedAt: null },
      select: {
        code: true,
        system: true,
        _count: { select: { items: true } },
      },
    });
    const existingCodes = new Set(dicts.map((dict) => dict.code));
    const missing = codes.find((code) => !existingCodes.has(code));

    if (missing) {
      throw systemDictNotFound(
        'SYSTEM_DICT_NOT_FOUND',
        'Dictionary not found.',
        { code: missing },
      );
    }

    const systemDict = dicts.find((dict) => dict.system);
    if (systemDict) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_IMMUTABLE',
        'System built-in dictionary cannot be deleted.',
        { code: systemDict.code },
      );
    }

    const dictWithItems = dicts.find((dict) => dict._count.items > 0);
    if (dictWithItems) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_HAS_ITEMS',
        'Dictionary has items and cannot be deleted.',
        { code: dictWithItems.code },
      );
    }

    await this.prisma.dictType.updateMany({
      where: { code: { in: [...codes] } },
      data: { deletedAt: new Date() },
    });

    return { deleted: true, affected: codes.length, codes };
  }

  async updateDictStatus(
    body: BatchUpdateDictStatusDto,
  ): Promise<DictBatchMutationRecord> {
    const codes = normalizeDictCodes(body);
    const enabled = normalizeBatchEnabled(body.enabled);
    const dicts = await this.prisma.dictType.findMany({
      where: { code: { in: [...codes] }, deletedAt: null },
      select: { code: true, system: true },
    });
    const existingCodes = new Set(dicts.map((dict) => dict.code));
    const missing = codes.find((code) => !existingCodes.has(code));
    if (missing) {
      throw systemDictNotFound(
        'SYSTEM_DICT_NOT_FOUND',
        'Dictionary not found.',
        { code: missing },
      );
    }
    const systemDict = !enabled && dicts.find((dict) => dict.system);
    if (systemDict) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_IMMUTABLE',
        'System built-in dictionary cannot be disabled.',
        { code: systemDict.code },
      );
    }

    await this.prisma.dictType.updateMany({
      where: { code: { in: [...codes] }, deletedAt: null },
      data: { enabled },
    });

    return { updated: true, affected: codes.length, codes };
  }

  async deleteDictItems(
    body: BatchDeleteDictItemsDto,
  ): Promise<DictItemDeleteMutationRecord> {
    const ids = normalizeDictItemIds(body);
    const items = await this.prisma.dictItem.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      include: { type: { select: { code: true, system: true } } },
    });
    const existingIds = new Set(items.map((item) => item.id));
    const missing = ids.find((id) => !existingIds.has(id));
    if (missing) {
      throw systemDictNotFound(
        'SYSTEM_DICT_ITEM_NOT_FOUND',
        'Dictionary item not found.',
        { itemId: missing },
      );
    }
    const systemItem = items.find((item) => item.type.system);
    if (systemItem) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item cannot be deleted.',
        { itemId: systemItem.id },
      );
    }

    await this.prisma.dictItem.updateMany({
      where: { id: { in: [...ids] } },
      data: { deletedAt: new Date() },
    });

    return { deleted: true, affected: ids.length, ids };
  }

  async updateDictItemStatus(
    body: BatchUpdateDictItemStatusDto,
  ): Promise<DictItemBatchMutationRecord> {
    const ids = normalizeDictItemIds(body);
    const enabled = normalizeBatchEnabled(body.enabled);
    const items = await this.prisma.dictItem.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      include: { type: { select: { code: true, system: true } } },
    });
    const existingIds = new Set(items.map((item) => item.id));
    const missing = ids.find((id) => !existingIds.has(id));
    if (missing) {
      throw systemDictNotFound(
        'SYSTEM_DICT_ITEM_NOT_FOUND',
        'Dictionary item not found.',
        { itemId: missing },
      );
    }
    const systemItem = !enabled && items.find((item) => item.type.system);
    if (systemItem) {
      throw systemDictBadRequest(
        'SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE',
        'System built-in dictionary item cannot be disabled.',
        { itemId: systemItem.id },
      );
    }

    await this.prisma.dictItem.updateMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      data: { enabled },
    });

    return { updated: true, affected: ids.length, ids };
  }

  async refreshDictCache(): Promise<DictCacheRefreshRecord> {
    const cachedKeys = await this.prisma.dictType.count({
      where: { deletedAt: null, enabled: true },
    });
    return {
      refreshed: true,
      cachedKeys,
      refreshedAt: new Date().toISOString(),
    };
  }

  private async findDictByCode(code: string): Promise<PrismaDictTypeWithItems> {
    const dict = await this.prisma.dictType.findFirst({
      where: { code, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
    });

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

  private async findDeletedDictByCode(
    code: string,
  ): Promise<PrismaDictTypeWithItems> {
    const dict = await this.prisma.dictType.findFirst({
      where: { code, deletedAt: { not: null } },
      include: {
        items: {
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
    });

    if (!dict) {
      throw systemDictNotFound(
        'SYSTEM_DICT_NOT_FOUND',
        'Deleted dictionary not found.',
        { code },
      );
    }

    return dict;
  }

  private async findDictItemById(
    code: string,
    itemId: string,
  ): Promise<Required<PrismaDictItem>> {
    const item = await this.prisma.dictItem.findFirst({
      where: {
        id: itemId,
        deletedAt: null,
        type: {
          code,
          deletedAt: null,
        },
      },
      include: { type: { select: { code: true, system: true } } },
    });

    if (!item) {
      throw systemDictNotFound(
        'SYSTEM_DICT_ITEM_NOT_FOUND',
        'Dictionary item not found.',
        { itemId },
      );
    }

    return item;
  }

  private async findDeletedDictItemById(
    itemId: string,
  ): Promise<Required<PrismaDictItem>> {
    const item = await this.prisma.dictItem.findFirst({
      where: {
        id: itemId,
        deletedAt: { not: null },
      },
      include: {
        type: { select: { code: true, deletedAt: true, system: true } },
      },
    });

    if (!item) {
      throw systemDictNotFound(
        'SYSTEM_DICT_ITEM_NOT_FOUND',
        'Deleted dictionary item not found.',
        { itemId },
      );
    }

    return item;
  }

  private async assertItemValueAvailable(
    typeId: string,
    value: string,
  ): Promise<void> {
    const existing = await this.prisma.dictItem.findFirst({
      where: {
        typeId,
        value,
      },
    });

    if (existing) {
      throw systemDictConflict(
        'SYSTEM_DICT_ITEM_ALREADY_EXISTS',
        'Dictionary item already exists.',
        { value },
      );
    }
  }
}

function toDictTypeRecord(dict: PrismaDictTypeWithItems): DictTypeRecord {
  return {
    id: dict.id,
    code: dict.code,
    name: dict.name,
    description: dict.description ?? undefined,
    remark: dict.remark ?? undefined,
    enabled: dict.enabled,
    system: dict.system,
    deletedAt: dict.deletedAt?.toISOString(),
    createdAt: dict.createdAt.toISOString(),
    updatedAt: dict.updatedAt.toISOString(),
    items: dict.items.map((item) => toDictItemRecord({ ...item, type: dict })),
  };
}

function toDictItemRecord(item: PrismaDictItem): DictItemRecord {
  return {
    dictCode: item.type?.code ?? '',
    id: item.id,
    label: item.label,
    value: item.value,
    sort: item.sort,
    enabled: item.enabled,
    colorType: item.colorType ?? undefined,
    cssClass: item.cssClass ?? undefined,
    remark: item.remark ?? undefined,
    deletedAt: item.deletedAt?.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toDictDataOptionRecord(
  item: PrismaDictItemWithType,
): DictDataOptionRecord {
  return {
    ...toDictItemRecord(item),
    dictCode: item.type.code,
  };
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

function assertDictCanBeDeleted(dict: PrismaDictTypeWithItems): void {
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
