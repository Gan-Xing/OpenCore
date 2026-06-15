import { Injectable } from '@nestjs/common';
import type { CreateRoleDto, UpdateRoleDto } from './system-role.dto';
import { seedSystemDepts } from '../system-dept/system-dept.records';
import {
  seedSystemRolePermissionCodes,
  seedSystemRoles,
  type SystemRoleRecord,
} from './system-role.records';
import {
  compareSystemRoleRecords,
  normalizeCreateSystemRoleInput,
  normalizeUpdateSystemRoleInput,
  systemRoleBadRequest,
  systemRoleConflict,
  systemRoleNotFound,
  SystemRoleRepository,
} from './system-role.repository';

@Injectable()
export class SeedSystemRoleRepository extends SystemRoleRepository {
  private roles: SystemRoleRecord[] = seedSystemRoles.map((role) => ({
    ...role,
    permissionCodes: [...role.permissionCodes],
    dataScopeDeptIds: [...role.dataScopeDeptIds],
  }));
  private readonly permissionCodes = new Set(seedSystemRolePermissionCodes);
  private readonly deptIds = new Set(seedSystemDepts.map((dept) => dept.id));

  async listRoles(): Promise<SystemRoleRecord[]> {
    return this.roles.map(cloneRole).sort(compareSystemRoleRecords);
  }

  async getRole(code: string): Promise<SystemRoleRecord> {
    return cloneRole(this.findMutableRoleByCode(code));
  }

  async createRole(body: CreateRoleDto): Promise<SystemRoleRecord> {
    const input = normalizeCreateSystemRoleInput(body);

    if (this.roles.some((role) => role.code === input.code)) {
      throw systemRoleConflict(
        'SYSTEM_ROLE_ALREADY_EXISTS',
        'Role already exists.',
        { code: input.code },
      );
    }

    this.assertPermissionCodes(input.permissionCodes);
    this.assertDeptIds(input.dataScopeDeptIds);
    const role: SystemRoleRecord = {
      id: `role_${input.code.replace(/[^a-z0-9]+/g, '_')}`,
      ...input,
    };
    this.roles = [...this.roles, role];
    return cloneRole(role);
  }

  async updateRole(
    code: string,
    body: UpdateRoleDto,
  ): Promise<SystemRoleRecord> {
    const role = this.findMutableRoleByCode(code);
    const input = normalizeUpdateSystemRoleInput(role, body);

    if (input.permissionCodes !== undefined) {
      this.assertPermissionCodes(input.permissionCodes);
      role.permissionCodes = [...input.permissionCodes];
    }
    this.assertDeptIds(input.dataScopeDeptIds);

    Object.assign(role, {
      name: input.name,
      enabled: input.enabled,
      system: input.system,
      dataScope: input.dataScope,
      dataScopeDeptIds: [...input.dataScopeDeptIds],
    });
    return cloneRole(role);
  }

  async deleteRole(code: string): Promise<{ deleted: true }> {
    const role = this.findMutableRoleByCode(code);

    if (role.system) {
      throw systemRoleBadRequest(
        'SYSTEM_ROLE_CANNOT_DELETE_SYSTEM',
        'System roles cannot be deleted.',
        { code },
      );
    }

    this.roles = this.roles.filter((candidate) => candidate.code !== code);
    return { deleted: true };
  }

  private findMutableRoleByCode(code: string): SystemRoleRecord {
    const role = this.roles.find((candidate) => candidate.code === code);

    if (!role) {
      throw systemRoleNotFound('SYSTEM_ROLE_NOT_FOUND', 'Role not found.', {
        code,
      });
    }

    return role;
  }

  private assertPermissionCodes(permissionCodes: readonly string[]): void {
    const missing = permissionCodes.find(
      (permissionCode) => !this.permissionCodes.has(permissionCode),
    );

    if (missing) {
      throw systemRoleNotFound(
        'SYSTEM_ROLE_PERMISSION_NOT_FOUND',
        'Permission not found.',
        { code: missing },
      );
    }
  }

  private assertDeptIds(deptIds: readonly string[]): void {
    const missingDeptId = deptIds.find((deptId) => !this.deptIds.has(deptId));

    if (missingDeptId) {
      throw systemRoleNotFound(
        'SYSTEM_ROLE_DEPT_NOT_FOUND',
        'System dept not found.',
        { id: missingDeptId },
      );
    }
  }
}

function cloneRole(role: SystemRoleRecord): SystemRoleRecord {
  return {
    ...role,
    permissionCodes: [...role.permissionCodes],
    dataScopeDeptIds: [...role.dataScopeDeptIds],
  };
}
