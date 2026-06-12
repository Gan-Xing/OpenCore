import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type { CreateDictTypeDto, UpdateDictTypeDto } from './system-dict.dto';
import type { DictTypeRecord } from './system-dict.records';
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

  createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    return this.repository.createDict(body);
  }

  updateDict(code: string, body: UpdateDictTypeDto): Promise<DictTypeRecord> {
    return this.repository.updateDict(code, body);
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
