import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import type { SystemConfigRecord } from './system-config.records';
import {
  createSystemConfigExportPreview,
  SystemConfigRepository,
  type SystemConfigExportPreview,
  type SystemConfigPageQuery,
} from './system-config.repository';

@Injectable()
export class SystemConfigService {
  constructor(private readonly repository: SystemConfigRepository) {}

  listConfig(
    query: SystemConfigPageQuery = {},
  ): Promise<PageResult<SystemConfigRecord>> {
    return this.repository.listConfig(query);
  }

  getConfig(key: string): Promise<SystemConfigRecord> {
    return this.repository.getConfig(key);
  }

  createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
    return this.repository.createConfig(body);
  }

  updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    return this.repository.updateConfig(key, body);
  }

  deleteConfig(key: string): Promise<{ deleted: true }> {
    return this.repository.deleteConfig(key);
  }

  async createExportPreview(
    query: SystemConfigPageQuery = {},
  ): Promise<SystemConfigExportPreview> {
    return createSystemConfigExportPreview(
      await this.repository.listConfig(query),
    );
  }
}
