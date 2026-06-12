import { Injectable } from '@nestjs/common';
import type { CreateRoleDto, UpdateRoleDto } from './system-role.dto';
import type { SystemRoleRecord } from './system-role.records';
import {
  createSystemRoleExportPreview,
  SystemRoleRepository,
  type SystemRoleExportPreview,
} from './system-role.repository';

@Injectable()
export class SystemRoleService {
  constructor(private readonly repository: SystemRoleRepository) {}

  listRoles(): Promise<SystemRoleRecord[]> {
    return this.repository.listRoles();
  }

  getRole(code: string): Promise<SystemRoleRecord> {
    return this.repository.getRole(code);
  }

  createRole(body: CreateRoleDto): Promise<SystemRoleRecord> {
    return this.repository.createRole(body);
  }

  updateRole(code: string, body: UpdateRoleDto): Promise<SystemRoleRecord> {
    return this.repository.updateRole(code, body);
  }

  deleteRole(code: string): Promise<{ deleted: true }> {
    return this.repository.deleteRole(code);
  }

  async createExportPreview(): Promise<SystemRoleExportPreview> {
    return createSystemRoleExportPreview(await this.repository.listRoles());
  }
}
