import { Injectable } from '@nestjs/common';
import type {
  AssignRoleUsersDto,
  CreateUserDto,
  RoleUserAssignmentDto,
  UpdateUserDto,
} from './system-user.dto';
import {
  createSystemUserExportPreview,
  SystemUserRepository,
  type SystemUserExportPreview,
  type SystemUserSummaryRecord,
} from './system-user.repository';

@Injectable()
export class SystemUserService {
  constructor(private readonly repository: SystemUserRepository) {}

  listUsers(): Promise<SystemUserSummaryRecord[]> {
    return this.repository.listUsers();
  }

  getUser(id: string): Promise<SystemUserSummaryRecord> {
    return this.repository.getUser(id);
  }

  createUser(body: CreateUserDto): Promise<SystemUserSummaryRecord> {
    return this.repository.createUser(body);
  }

  updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<SystemUserSummaryRecord> {
    return this.repository.updateUser(id, body);
  }

  deleteUser(id: string): Promise<{ deleted: true }> {
    return this.repository.deleteUser(id);
  }

  getRoleUserAssignment(roleCode: string): Promise<RoleUserAssignmentDto> {
    return this.repository.getRoleUserAssignment(roleCode);
  }

  assignRoleUsers(
    roleCode: string,
    body: AssignRoleUsersDto,
  ): Promise<RoleUserAssignmentDto> {
    return this.repository.assignRoleUsers(roleCode, body);
  }

  async createExportPreview(): Promise<SystemUserExportPreview> {
    return createSystemUserExportPreview(await this.repository.listUsers());
  }
}
