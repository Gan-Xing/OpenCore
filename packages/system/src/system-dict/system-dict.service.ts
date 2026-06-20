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
import type {
  DictDataOptionRecord,
  DictItemRecord,
  DictTypeRecord,
} from './system-dict.records';
import {
  createSystemDictExportPreview,
  createSystemDictItemsExportPreview,
  SystemDictRepository,
  type DictBatchMutationRecord,
  type DictCacheRefreshRecord,
  type DictDeleteMutationRecord,
  type DictItemBatchMutationRecord,
  type DictItemDeleteMutationRecord,
  type SystemDictExportPreview,
  type SystemDictItemPageQuery,
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

  listDictItemsPage(
    query: SystemDictItemPageQuery = {},
  ): Promise<PageResult<DictItemRecord>> {
    return this.repository.listDictItemsPage(query);
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

  deleteDicts(body: BatchDeleteDictTypesDto): Promise<DictDeleteMutationRecord> {
    return this.repository.deleteDicts(body);
  }

  updateDictStatus(
    body: BatchUpdateDictStatusDto,
  ): Promise<DictBatchMutationRecord> {
    return this.repository.updateDictStatus(body);
  }

  deleteDictItems(
    body: BatchDeleteDictItemsDto,
  ): Promise<DictItemDeleteMutationRecord> {
    return this.repository.deleteDictItems(body);
  }

  updateDictItemStatus(
    body: BatchUpdateDictItemStatusDto,
  ): Promise<DictItemBatchMutationRecord> {
    return this.repository.updateDictItemStatus(body);
  }

  refreshDictCache(): Promise<DictCacheRefreshRecord> {
    return this.repository.refreshDictCache();
  }

  async createExportPreview(
    query: SystemDictPageQuery = {},
  ): Promise<SystemDictExportPreview> {
    return createSystemDictExportPreview(
      await this.repository.listDicts(query),
    );
  }

  async createItemsExportPreview(
    query: SystemDictItemPageQuery = {},
  ): Promise<SystemDictExportPreview> {
    return createSystemDictItemsExportPreview(
      await this.repository.listDictItemsPage(query),
    );
  }
}
