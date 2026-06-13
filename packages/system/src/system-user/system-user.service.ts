import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  AssignRoleUsersDto,
  AssignUserRolesDto,
  BatchDeleteUsersDto,
  BatchSetUserStatusDto,
  CreateUserDto,
  ImportUsersDto,
  ListUsersQueryDto,
  ResetUserPasswordDto,
  RoleUserAssignmentDto,
  SetUserStatusDto,
  UpdateUserPasswordDto,
  UpdateUserProfileDto,
  UpdateUserDto,
  UserRoleAssignmentDto,
} from './system-user.dto';
import {
  createSystemUserImportTemplate,
  createSystemUserExportPreview,
  normalizeSystemUserImportRecord,
  parseSystemUserImport,
  normalizeResetUserPasswordInput,
  normalizeSetUserStatusInput,
  SystemUserRepository,
  type SystemUserAvatarRecord,
  type SystemUserAvatarUpdateInput,
  type SystemUserBatchMutationRecord,
  type SystemUserExportPreview,
  type SystemUserImportResultRecord,
  type SystemUserImportTemplateRecord,
  type SystemUserOptionRecord,
  type SystemUserSummaryRecord,
} from './system-user.repository';

@Injectable()
export class SystemUserService {
  constructor(private readonly repository: SystemUserRepository) {}

  listUsers(query?: ListUsersQueryDto): Promise<SystemUserSummaryRecord[]> {
    return this.repository.listUsers(query);
  }

  listUserOptions(
    query?: ListUsersQueryDto,
  ): Promise<readonly SystemUserOptionRecord[]> {
    return this.repository.listUserOptions(query);
  }

  getUser(id: string): Promise<SystemUserSummaryRecord> {
    return this.repository.getUser(id);
  }

  getUserAvatar(id: string): Promise<SystemUserAvatarRecord> {
    return this.repository.getUserAvatar(id);
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

  updateUserProfile(
    id: string,
    body: UpdateUserProfileDto,
  ): Promise<SystemUserSummaryRecord> {
    return this.repository.updateUserProfile(id, body);
  }

  updateUserPassword(
    id: string,
    body: UpdateUserPasswordDto,
  ): Promise<SystemUserSummaryRecord> {
    return this.repository.updateUserPassword(id, body);
  }

  updateUserAvatar(
    id: string,
    input: SystemUserAvatarUpdateInput,
  ): Promise<SystemUserSummaryRecord> {
    return this.repository.updateUserAvatar(id, input);
  }

  clearUserAvatar(id: string): Promise<SystemUserSummaryRecord> {
    return this.repository.clearUserAvatar(id);
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

  async setUsersStatus(
    body: BatchSetUserStatusDto,
  ): Promise<SystemUserBatchMutationRecord> {
    return await this.repository.setUsersStatus(body);
  }

  async deleteUsers(
    body: BatchDeleteUsersDto,
  ): Promise<SystemUserBatchMutationRecord> {
    return await this.repository.deleteUsers(body);
  }

  getUserRoleAssignment(id: string): Promise<UserRoleAssignmentDto> {
    return this.repository.getUserRoleAssignment(id);
  }

  assignUserRoles(
    id: string,
    body: AssignUserRolesDto,
  ): Promise<UserRoleAssignmentDto> {
    return this.repository.assignUserRoles(id, body);
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

  createImportTemplate(): SystemUserImportTemplateRecord {
    return createSystemUserImportTemplate();
  }

  async importUsers(
    body: ImportUsersDto,
  ): Promise<SystemUserImportResultRecord> {
    const records = parseSystemUserImport(body);
    const updateExisting = normalizeImportUpdateExisting(body.updateExisting);
    const existingUsers = new Map(
      (await this.repository.listUsers()).map((user) => [user.username, user]),
    );
    const seenUsernames = new Set<string>();
    const createdUsernames: string[] = [];
    const updatedUsernames: string[] = [];
    const failures: SystemUserImportResultRecord['failures'][number][] = [];

    for (const record of records) {
      let username = record.values.username?.trim() || undefined;

      try {
        const input = normalizeSystemUserImportRecord(record);
        username = input.username;

        if (seenUsernames.has(input.username)) {
          throw new Error(
            `Duplicate username in import file: ${input.username}`,
          );
        }
        seenUsernames.add(input.username);

        const existing = existingUsers.get(input.username);

        if (existing) {
          if (!updateExisting) {
            throw new Error(`User already exists: ${input.username}`);
          }

          const updated = await this.repository.updateUser(existing.id, {
            displayName: input.displayName,
            password: input.password,
            roleCodes: input.roleCodes,
            deptId: input.deptId ?? null,
            postCodes: input.postCodes,
            enabled: input.enabled,
          });
          existingUsers.set(updated.username, updated);
          updatedUsernames.push(updated.username);
          continue;
        }

        if (!input.password) {
          throw new Error(
            `Password is required when creating user: ${input.username}`,
          );
        }

        const created = await this.repository.createUser({
          username: input.username,
          displayName: input.displayName,
          password: input.password,
          roleCodes: input.roleCodes,
          deptId: input.deptId,
          postCodes: input.postCodes,
          enabled: input.enabled,
        });
        existingUsers.set(created.username, created);
        createdUsernames.push(created.username);
      } catch (error) {
        failures.push({
          rowNumber: record.rowNumber,
          username,
          reason: error instanceof Error ? error.message : 'Unknown error.',
        });
      }
    }

    return {
      totalRows: records.length,
      created: createdUsernames.length,
      updated: updatedUsernames.length,
      failed: failures.length,
      createdUsernames,
      updatedUsernames,
      failures,
      updatedSessionUsernames: updatedUsernames,
    };
  }
}

function normalizeImportUpdateExisting(value: unknown): boolean {
  if (value === undefined) {
    return false;
  }

  if (typeof value !== 'boolean') {
    throw new BadRequestException(
      'System user import updateExisting must be a boolean.',
    );
  }

  return value;
}
