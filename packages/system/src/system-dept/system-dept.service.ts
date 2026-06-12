import { Injectable } from '@nestjs/common';
import type {
  CreateSystemDeptDto,
  UpdateSystemDeptDto,
} from './system-dept.dto';
import type {
  SystemDeptRecord,
  SystemDeptTreeRecord,
} from './system-dept.records';
import {
  createSystemDeptExportPreview,
  SystemDeptRepository,
  type SystemDeptExportPreview,
  type SystemDeptQuery,
} from './system-dept.repository';

@Injectable()
export class SystemDeptService {
  constructor(private readonly repository: SystemDeptRepository) {}

  listDeptTree(query: SystemDeptQuery = {}): Promise<SystemDeptTreeRecord[]> {
    return this.repository.listDeptTree(query);
  }

  createDept(body: CreateSystemDeptDto): Promise<SystemDeptRecord> {
    return this.repository.createDept(body);
  }

  updateDept(id: string, body: UpdateSystemDeptDto): Promise<SystemDeptRecord> {
    return this.repository.updateDept(id, body);
  }

  deleteDept(id: string): Promise<{ deleted: true }> {
    return this.repository.deleteDept(id);
  }

  async createExportPreview(
    query: SystemDeptQuery = {},
  ): Promise<SystemDeptExportPreview> {
    return createSystemDeptExportPreview(
      await this.repository.listDeptTree(query),
    );
  }
}
