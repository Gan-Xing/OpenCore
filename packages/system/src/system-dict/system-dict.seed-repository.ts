import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type { CreateDictTypeDto, UpdateDictTypeDto } from './system-dict.dto';
import { seedDictTypes, type DictTypeRecord } from './system-dict.records';
import {
  cloneDictType,
  createSystemDictPageResult,
  normalizeSystemDictPageQuery,
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

  async createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    if (this.dictTypes.some((dict) => dict.code === body.code)) {
      throw new ConflictException(`Dictionary already exists: ${body.code}`);
    }

    const dict: DictTypeRecord = {
      id: `dict_${body.code.replaceAll('.', '_')}`,
      code: body.code,
      name: body.name,
      description: body.description,
      enabled: body.enabled ?? true,
      items: body.items ?? [],
    };
    this.dictTypes = [dict, ...this.dictTypes];
    return cloneDictType(dict);
  }

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const dict = this.findDict(code);
    Object.assign(dict, {
      name: body.name ?? dict.name,
      description: body.description ?? dict.description,
      enabled: body.enabled ?? dict.enabled,
      items: body.items ?? dict.items,
    });
    return cloneDictType(dict);
  }

  async deleteDict(code: string): Promise<{ deleted: true }> {
    this.findDict(code);
    this.dictTypes = this.dictTypes.filter((dict) => dict.code !== code);
    return { deleted: true };
  }

  private findDict(code: string): DictTypeRecord {
    const dict = this.dictTypes.find((candidate) => candidate.code === code);

    if (!dict) {
      throw new NotFoundException(`Dictionary not found: ${code}`);
    }

    return dict;
  }
}
