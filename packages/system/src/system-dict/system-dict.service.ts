import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
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
  createSystemDictExportPreview,
  SystemDictRepository,
  type SystemDictExportPreview,
  type SystemDictPageQuery,
} from './system-dict.repository';

@Injectable()
export class SystemDictService {
  constructor(private readonly repository: SystemDictRepository) {}

  listDicts(
    query: SystemDictPageQuery = {},
  ): Promise<PageResult<DictTypeRecord>> {
    return this.repository.listDicts(query);
  }

  getDict(code: string): Promise<DictTypeRecord> {
    return this.repository.getDict(code);
  }

  listDictDataOptions(
    query: DictDataOptionQueryDto = {},
  ): Promise<readonly DictDataOptionRecord[]> {
    return this.repository.listDictDataOptions(query);
  }

  listDictItems(code: string): Promise<readonly DictItemRecord[]> {
    return this.repository.listDictItems(code);
  }

  getDictItem(code: string, itemId: string): Promise<DictItemRecord> {
    return this.repository.getDictItem(code, itemId);
  }

  createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    return this.repository.createDict(body);
  }

  createDictItem(
    code: string,
    body: CreateDictItemDto,
  ): Promise<DictItemRecord> {
    return this.repository.createDictItem(code, body);
  }

  updateDict(code: string, body: UpdateDictTypeDto): Promise<DictTypeRecord> {
    return this.repository.updateDict(code, body);
  }

  updateDictItem(
    code: string,
    itemId: string,
    body: UpdateDictItemDto,
  ): Promise<DictItemRecord> {
    return this.repository.updateDictItem(code, itemId, body);
  }

  deleteDictItem(code: string, itemId: string): Promise<{ deleted: true }> {
    return this.repository.deleteDictItem(code, itemId);
  }

  deleteDict(code: string): Promise<{ deleted: true }> {
    return this.repository.deleteDict(code);
  }

  async createExportPreview(
    query: SystemDictPageQuery = {},
  ): Promise<SystemDictExportPreview> {
    return createSystemDictExportPreview(
      await this.repository.listDicts(query),
    );
  }
}
