import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type { CreateDictTypeDto, UpdateDictTypeDto } from './system-dict.dto';
import type { DictItemRecord, DictTypeRecord } from './system-dict.records';
import {
  createSystemDictPageResult,
  normalizeSystemDictPageQuery,
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
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
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

  async createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    if (await this.prisma.dictType.findUnique({ where: { code: body.code } })) {
      throw new ConflictException(`Dictionary already exists: ${body.code}`);
    }

    const dict = await this.prisma.dictType.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        enabled: body.enabled ?? true,
        items: {
          create: (body.items ?? []).map((item) => ({
            id: item.id,
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

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const existing = await this.findDictByCode(code);

    const dict = await this.prisma.dictType.update({
      where: { code },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        enabled: body.enabled ?? existing.enabled,
        ...(body.items
          ? {
              items: {
                deleteMany: {},
                create: body.items.map((item) => ({
                  id: item.id,
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
