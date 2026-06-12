import { Injectable } from '@nestjs/common';
import type {
  AssignRoleUsersDto,
  CreateUserDto,
  ListUsersQueryDto,
  ResetUserPasswordDto,
  RoleUserAssignmentDto,
  SetUserStatusDto,
  UpdateUserDto,
} from './system-user.dto';
import {
  createSystemUserExportPreview,
  normalizeResetUserPasswordInput,
  normalizeSetUserStatusInput,
  SystemUserRepository,
  type SystemUserExportPreview,
  type SystemUserSummaryRecord,
} from './system-user.repository';

@Injectable()
export class SystemUserService {
  constructor(private readonly repository: SystemUserRepository) {}

  listUsers(query?: ListUsersQueryDto): Promise<SystemUserSummaryRecord[]> {
    return this.repository.listUsers(query);
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

  async setUserStatus(
    id: string,
    body: SetUserStatusDto,
  ): Promise<SystemUserSummaryRecord> {
    const input = normalizeSetUserStatusInput(body);
    return await this.repository.updateUser(id, { enabled: input.enabled });
  }

  async resetUserPassword(
    id: string,
    body: ResetUserPasswordDto,
  ): Promise<SystemUserSummaryRecord> {
    const input = normalizeResetUserPasswordInput(body);
    return await this.repository.updateUser(id, { password: input.password });
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

  async createExportPreview(
    query?: ListUsersQueryDto,
  ): Promise<SystemUserExportPreview> {
    return createSystemUserExportPreview(
      await this.repository.listUsers(query),
    );
  }
}
