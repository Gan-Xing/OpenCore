import { Injectable } from '@nestjs/common';
import type {
  CreateSystemDeptDto,
  UpdateSystemDeptOrderDto,
  UpdateSystemDeptDto,
} from './system-dept.dto';
import type {
  SystemDeptOptionRecord,
  SystemDeptRecord,
  SystemDeptTreeRecord,
} from './system-dept.records';
import {
  createSystemDeptExportPreview,
  SystemDeptRepository,
  type SystemDeptExportPreview,
  type SystemDeptOrderMutationResult,
  type SystemDeptQuery,
} from './system-dept.repository';

@Injectable()
export class SystemDeptService {
  constructor(private readonly repository: SystemDeptRepository) {}

  listDeptTree(query: SystemDeptQuery = {}): Promise<SystemDeptTreeRecord[]> {
    return this.repository.listDeptTree(query);
  }

  listDeptOptions(): Promise<SystemDeptOptionRecord[]> {
    return this.repository.listDeptOptions();
  }

  getDept(id: string): Promise<SystemDeptRecord> {
    return this.repository.getDept(id);
  }

  createDept(body: CreateSystemDeptDto): Promise<SystemDeptRecord> {
    return this.repository.createDept(body);
  }

  updateDept(id: string, body: UpdateSystemDeptDto): Promise<SystemDeptRecord> {
    return this.repository.updateDept(id, body);
  }

  updateDeptOrder(
    body: UpdateSystemDeptOrderDto,
  ): Promise<SystemDeptOrderMutationResult> {
    return this.repository.updateDeptOrder(body);
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
