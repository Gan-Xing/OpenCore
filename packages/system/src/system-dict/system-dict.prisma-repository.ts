import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
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
  normalizeOptionalBoolean,
  normalizeUpdateDictItemInput,
  SystemDictRepository,
  type SystemDictPageQuery,
} from './system-dict.repository';

type PrismaDictTypeWithItems = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  items: PrismaDictItem[];
};

type PrismaDictItem = {
  id: string;
  typeId?: string;
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
};

type PrismaDictItemWithType = PrismaDictItem & {
  type: {
    code: string;
    enabled: boolean;
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
    const total = await this.prisma.dictType.count();
    const pagination = normalizeSystemDictPageQuery(query, total);
    const rows = await this.prisma.dictType.findMany({
      include: {
        items: {
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { code: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemDictPageResult(rows.map(toDictTypeRecord), pagination);
  }

  async getDict(code: string): Promise<DictTypeRecord> {
    return toDictTypeRecord(await this.findDictByCode(code));
  }

  async listDictDataOptions(
    query: DictDataOptionQueryDto = {},
  ): Promise<readonly DictDataOptionRecord[]> {
    const rows = await this.prisma.dictItem.findMany({
      where: {
        enabled: true,
        type: {
          enabled: true,
          ...(query.dictCode ? { code: query.dictCode } : {}),
        },
      },
      include: {
        type: {
          select: {
            code: true,
            enabled: true,
          },
        },
      },
    });

    return rows.map(toDictDataOptionRecord).sort(compareDictDataOptions);
  }

  async listDictItems(code: string): Promise<readonly DictItemRecord[]> {
    return (await this.findDictByCode(code)).items.map(toDictItemRecord);
  }

  async getDictItem(code: string, itemId: string): Promise<DictItemRecord> {
    return toDictItemRecord(await this.findDictItemById(code, itemId));
  }

  async createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    if (await this.prisma.dictType.findUnique({ where: { code: body.code } })) {
      throw new ConflictException(`Dictionary already exists: ${body.code}`);
    }
    const normalizedItems = (body.items ?? []).map((item, index) =>
      normalizeCreateDictItemInput(item, index),
    );

    const dict = await this.prisma.dictType.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        enabled: normalizeOptionalBoolean(body.enabled, 'enabled') ?? true,
        items: {
          create: normalizedItems.map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            label: item.label,
            value: item.value,
            sort: item.sort,
            enabled: item.enabled,
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
      },
    });

    return toDictItemRecord(item);
  }

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const existing = await this.findDictByCode(code);
    const normalizedItems = body.items?.map((item, index) =>
      normalizeCreateDictItemInput(item, index),
    );

    const dict = await this.prisma.dictType.update({
      where: { code },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        enabled:
          normalizeOptionalBoolean(body.enabled, 'enabled') ?? existing.enabled,
        ...(normalizedItems
          ? {
              items: {
                deleteMany: {},
                create: normalizedItems.map((item) => ({
                  ...(item.id ? { id: item.id } : {}),
                  label: item.label,
                  value: item.value,
                  sort: item.sort,
                  enabled: item.enabled,
                })),
              },
            }
          : {}),
      },
      include: { items: { orderBy: [{ sort: 'asc' }, { value: 'asc' }] } },
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
      },
    });

    return toDictItemRecord(item);
  }

  async deleteDictItem(
    code: string,
    itemId: string,
  ): Promise<{ deleted: true }> {
    await this.findDictItemById(code, itemId);
    await this.prisma.dictItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async deleteDict(code: string): Promise<{ deleted: true }> {
    await this.findDictByCode(code);
    await this.prisma.dictType.delete({ where: { code } });
    return { deleted: true };
  }

  private async findDictByCode(code: string): Promise<PrismaDictTypeWithItems> {
    const dict = await this.prisma.dictType.findUnique({
      where: { code },
      include: { items: { orderBy: [{ sort: 'asc' }, { value: 'asc' }] } },
    });

    if (!dict) {
      throw new NotFoundException(`Dictionary not found: ${code}`);
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
        type: {
          code,
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Dictionary item not found: ${itemId}`);
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
      throw new ConflictException(`Dictionary item already exists: ${value}`);
    }
  }
}

function toDictTypeRecord(dict: PrismaDictTypeWithItems): DictTypeRecord {
  return {
    id: dict.id,
    code: dict.code,
    name: dict.name,
    description: dict.description ?? undefined,
    enabled: dict.enabled,
    items: dict.items.map(toDictItemRecord),
  };
}

function toDictItemRecord(item: PrismaDictItem): DictItemRecord {
  return {
    id: item.id,
    label: item.label,
    value: item.value,
    sort: item.sort,
    enabled: item.enabled,
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
