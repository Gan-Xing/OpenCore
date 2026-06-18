#!/usr/bin/env node

import {
  HttpStatusError,
  assertArray,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  assertString,
  createTypedSmokeRuntime,
  formatBody,
} from './runtime';

const {
  strToU8,
  zipSync,
} = require('../../packages/system/node_modules/fflate');

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, login, timeoutMs, username } = smoke;
const apiRequest = smoke.apiRequest as any;
const request = smoke.request as any;
const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const extensionByMimeType = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const xlsxContentType =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const smokeUsername = `user_security_${runId}`;
const smokePassword = `UserSecuritySmoke-${runId}`;
const resetPassword = `UserSecurityReset-${runId}`;
const selfPassword = `UserSecuritySelf-${runId}`;
const batchUsernames = [`user_batch_${runId}_a`, `user_batch_${runId}_b`];
const batchPassword = `UserBatchSmoke-${runId}`;
const dataScopeUsername = `user_scope_${runId}`;
const dataScopePassword = `UserDataScope-${runId}`;
const dataScopeRoleCode = `user_scope_read_export_${runId}`;
const importUsername = `user_import_${runId}`;
const xlsxImportUsername = `user_import_xlsx_${runId}`;
const importPassword = `UserImportSmoke-${runId}`;
const importUpdatedPassword = `UserImportUpdated-${runId}`;
const importGuardRoleCode = `user_import_create_only_${runId}`;
const importGuardUsername = `user_import_guard_${runId}`;
const importGuardPassword = `UserImportGuard-${runId}`;
let adminToken;
let smokeUserId;
let smokeUserToken;
let dataScopeUserId;
let dataScopeRoleCreated = false;
let importUserId;
let xlsxImportUserId;
let importGuardUserId;
let importGuardRoleCreated = false;
const batchUserIds = new Set<string>();
let originalAdminDisplayName;
let originalAdminAvatarUpload;
let adminAvatarTouched = false;
async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    await request(`${apiPrefix}/core/users/simple-list`, {
      expected: [401],
    });

    const loginResponse = await login();
    adminToken = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(adminToken);

    const adminProfile = await apiRequest('/core/users/profile');
    const adminUserId = assertString(adminProfile.id, 'admin profile id');
    originalAdminDisplayName = assertString(
      adminProfile.displayName,
      'admin profile displayName',
    );
    originalAdminAvatarUpload = await captureAvatarUpload(
      adminProfile.avatarUrl,
    );
    assertEqual(adminProfile.username, username, 'admin profile username');

    await request(`${apiPrefix}/core/users/profile/avatar`, {
      method: 'POST',
      expected: [401],
      body: createAvatarUploadForm(
        Buffer.from(tinyPngBase64, 'base64'),
        'image/png',
        `admin-avatar-${runId}.png`,
      ),
    });
    await apiRequest('/core/users/profile/avatar', {
      method: 'POST',
      expected: [400],
      body: createAvatarUploadForm(
        Buffer.from('<svg></svg>'),
        'image/svg+xml',
        `admin-avatar-${runId}.svg`,
      ),
    });
    const avatarBytesGuard = await apiRequest('/core/users/profile/avatar', {
      method: 'POST',
      expected: [400],
      body: createAvatarUploadForm(
        Buffer.from('not an image'),
        'image/png',
        `admin-avatar-${runId}.png`,
      ),
    });
    assertEqual(
      avatarBytesGuard.error.code,
      'USER_AVATAR_BYTES_MISMATCH',
      'avatar bytes guard error code',
    );
    const largePngBody = Buffer.concat([
      Buffer.from('89504e470d0a1a0a', 'hex'),
      Buffer.alloc(1_050_000),
    ]);
    const avatarSizeGuard = await apiRequest('/core/users/profile/avatar', {
      method: 'POST',
      expected: [400],
      body: createAvatarUploadForm(
        largePngBody,
        'image/png',
        `admin-avatar-large-${runId}.png`,
      ),
    });
    assertEqual(
      avatarSizeGuard.error.code,
      'USER_AVATAR_TOO_LARGE',
      'avatar size guard error code',
    );
    const avatarBody = Buffer.from(tinyPngBase64, 'base64');
    const avatarProfile = await apiRequest('/core/users/profile/avatar', {
      method: 'POST',
      body: createAvatarUploadForm(
        avatarBody,
        'image/png',
        `admin-avatar-${runId}.png`,
      ),
    });
    adminAvatarTouched = true;
    const avatarUrl = assertString(avatarProfile.avatarUrl, 'avatar URL');
    assertEqual(avatarProfile.avatarMimeType, 'image/png', 'avatar mime type');
    assertEqual(
      avatarProfile.avatarSizeBytes,
      avatarBody.byteLength,
      'avatar size',
    );
    assertString(avatarProfile.avatarUpdatedAt, 'avatar updatedAt');
    const downloadedAvatar = await requestBuffer(avatarUrl, {
      expected: [200],
    });
    assertEqual(
      normalizeContentType(downloadedAvatar.headers.get('content-type')),
      'image/png',
      'avatar download content-type',
    );
    assertBufferEqual(
      downloadedAvatar.body,
      Buffer.from(tinyPngBase64, 'base64'),
      'avatar download bytes',
    );
    const avatarSession = await request(`${apiPrefix}/auth/me`, {
      token: adminToken,
      expected: [200, 201],
    });
    assertEqual(avatarSession.user.avatarUrl, avatarUrl, 'auth/me avatar URL');
    const clearedAvatarProfile = await apiRequest(
      '/core/users/profile/avatar',
      {
        method: 'DELETE',
      },
    );
    assertEqual(
      clearedAvatarProfile.avatarUrl,
      undefined,
      'cleared avatar URL',
    );
    await request(avatarUrl, { expected: [404] });

    const profileDisplayName = `OpenCore Admin Smoke ${runId}`;
    const updatedProfile = await apiRequest('/core/users/profile', {
      method: 'PATCH',
      body: {
        displayName: profileDisplayName,
      },
    });
    assertEqual(
      updatedProfile.displayName,
      profileDisplayName,
      'updated admin profile displayName',
    );
    assertEqual(
      updatedProfile.system,
      true,
      'updated admin profile system flag',
    );

    const refreshedSession = await request(`${apiPrefix}/auth/me`, {
      token: adminToken,
      expected: [200, 201],
    });
    assertEqual(
      refreshedSession.user.displayName,
      profileDisplayName,
      'auth/me refreshed profile displayName',
    );
    await apiRequest('/core/users/profile', {
      method: 'PATCH',
      expected: [400],
      body: {
        displayName: '',
      },
    });
    await apiRequest(`/core/users/${encodeURIComponent(adminUserId)}`, {
      method: 'PATCH',
      expected: [400],
      body: {
        displayName: 'Management Update Must Still Fail',
      },
    });

    await apiRequest('/core/users', {
      method: 'POST',
      expected: [404],
      body: {
        username: `${smokeUsername}_bad_post`,
        displayName: 'Smoke User Bad Post',
        password: smokePassword,
        roleCodes: ['viewer'],
        postCodes: ['missing_post'],
        enabled: true,
      },
    });
    await apiRequest('/core/users?deptId=missing_dept', {
      expected: [404],
    });
    await apiRequest('/core/users/simple-list?deptId=missing_dept', {
      expected: [404],
    });

    const createdUser = await apiRequest('/core/users', {
      method: 'POST',
      body: {
        username: smokeUsername,
        displayName: 'Smoke User Security',
        password: smokePassword,
        roleCodes: ['viewer'],
        deptId: 'dept_operations',
        postCodes: ['engineer'],
        enabled: true,
      },
    });
    smokeUserId = assertString(createdUser.id, 'created smoke user id');
    assertEqual(
      createdUser.deptId,
      'dept_operations',
      'created user department',
    );
    assertIncludes(createdUser.postCodes, 'engineer', 'created user posts');
    const operationUserOptions = await apiRequest(
      '/core/users/simple-list?deptId=dept_operations',
    );
    assertUserOptionIncludesUsername(
      operationUserOptions,
      smokeUsername,
      'operations department user options',
    );
    const smokeOption = findUserOption(operationUserOptions, smokeUsername);
    assertEqual(smokeOption.id, smokeUserId, 'simple-list option id');
    assertEqual(
      smokeOption.displayName,
      'Smoke User Security',
      'simple-list option displayName',
    );
    assertEqual(
      smokeOption.deptId,
      'dept_operations',
      'simple-list option department',
    );
    assertIncludes(
      smokeOption.postCodes,
      'engineer',
      'simple-list option post codes',
    );
    assertEqual(
      'roleCodes' in smokeOption,
      false,
      'simple-list option roleCodes exposure',
    );
    assertEqual(
      'enabled' in smokeOption,
      false,
      'simple-list option enabled exposure',
    );
    assertEqual(
      'system' in smokeOption,
      false,
      'simple-list option system exposure',
    );
    assertUserListIncludesUsername(
      await apiRequest('/core/users?deptId=dept_operations'),
      smokeUsername,
      'operations department user list',
    );
    assertUserListIncludesUsername(
      await apiRequest('/core/users?deptId=dept_headquarters'),
      smokeUsername,
      'headquarters subtree user list',
    );
    assertUserListNotIncludesUsername(
      await apiRequest('/core/users?deptId=dept_engineering'),
      smokeUsername,
      'engineering department user list',
    );
    assertUserOptionNotIncludesUsername(
      await apiRequest('/core/users/simple-list?deptId=dept_engineering'),
      smokeUsername,
      'engineering department user options',
    );
    const userExport = await apiRequest(
      '/core/users/export?deptId=dept_operations',
    );
    assertEqual(
      userExport.filename,
      'opencore-system-users.xlsx',
      'user export filename',
    );
    assertEqual(
      userExport.contentType,
      xlsxContentType,
      'user export MIME type',
    );
    assertEqual(userExport.scope, 'current-page', 'user export scope');
    assertEqual(userExport.rowCount > 0, true, 'user export row count');
    assertIncludes(userExport.columns, 'postCodes', 'user export columns');
    const userExportWorkbook = Buffer.from(
      assertString(userExport.contentBase64, 'user export workbook body'),
      'base64',
    );
    assertEqual(
      userExportWorkbook.subarray(0, 2).toString('utf8'),
      'PK',
      'user export XLSX zip header',
    );
    assertEqual(
      userExportWorkbook.length > 1000,
      true,
      'user export XLSX byte length',
    );

    await apiRequest('/core/roles', {
      method: 'POST',
      body: {
        code: dataScopeRoleCode,
        name: 'User Data Scope Smoke',
        permissionCodes: ['core:user:read', 'core:user:export'],
        enabled: true,
        dataScope: 'self',
        dataScopeDeptIds: [],
      },
    });
    dataScopeRoleCreated = true;
    const dataScopeUser = await apiRequest('/core/users', {
      method: 'POST',
      body: {
        username: dataScopeUsername,
        displayName: 'User Data Scope Smoke',
        password: dataScopePassword,
        roleCodes: [dataScopeRoleCode],
        deptId: 'dept_operations',
        postCodes: ['engineer'],
        enabled: true,
      },
    });
    dataScopeUserId = assertString(
      dataScopeUser.id,
      'data-scope smoke user id',
    );
    const dataScopeLogin = await loginUser(
      dataScopeUsername,
      dataScopePassword,
      [200, 201],
    );
    const dataScopeToken = assertString(
      dataScopeLogin.accessToken,
      'data-scope smoke accessToken',
    );
    const scopedUsers = await request(`${apiPrefix}/core/users`, {
      token: dataScopeToken,
    });
    assertUserListIncludesUsername(
      scopedUsers,
      dataScopeUsername,
      'self data-scope user list',
    );
    assertUserListNotIncludesUsername(
      scopedUsers,
      username,
      'self data-scope user list',
    );
    assertUserListNotIncludesUsername(
      scopedUsers,
      smokeUsername,
      'self data-scope user list',
    );
    assertUserListIncludesUsername(
      await request(`${apiPrefix}/core/users?deptId=dept_headquarters`, {
        token: dataScopeToken,
      }),
      dataScopeUsername,
      'self data-scope headquarters intersection',
    );
    assertUserListNotIncludesUsername(
      await request(`${apiPrefix}/core/users?deptId=dept_engineering`, {
        token: dataScopeToken,
      }),
      dataScopeUsername,
      'self data-scope engineering intersection',
    );
    const scopedOptions = await request(`${apiPrefix}/core/users/simple-list`, {
      token: dataScopeToken,
    });
    assertUserOptionIncludesUsername(
      scopedOptions,
      dataScopeUsername,
      'self data-scope simple-list',
    );
    assertUserOptionNotIncludesUsername(
      scopedOptions,
      smokeUsername,
      'self data-scope simple-list',
    );
    assertUserOptionNotIncludesUsername(
      await request(
        `${apiPrefix}/core/users/simple-list?deptId=dept_engineering`,
        {
          token: dataScopeToken,
        },
      ),
      dataScopeUsername,
      'self data-scope simple-list department intersection',
    );
    const scopedExport = await request(`${apiPrefix}/core/users/export`, {
      token: dataScopeToken,
    });
    assertEqual(scopedExport.rowCount, 1, 'self data-scope export row count');
    const scopedExportWorkbook = Buffer.from(
      assertString(
        scopedExport.contentBase64,
        'scoped user export workbook body',
      ),
      'base64',
    );
    assertEqual(
      scopedExportWorkbook.subarray(0, 2).toString('utf8'),
      'PK',
      'self data-scope export XLSX zip header',
    );
    await request(`${apiPrefix}/auth/logout`, {
      method: 'POST',
      token: dataScopeToken,
    });

    const batchUsers: any[] = [];
    for (const batchUsername of batchUsernames) {
      const batchUser = await apiRequest('/core/users', {
        method: 'POST',
        body: {
          username: batchUsername,
          displayName: `Batch User ${batchUsername.slice(-1).toUpperCase()}`,
          password: batchPassword,
          roleCodes: ['viewer'],
          deptId: 'dept_operations',
          postCodes: ['engineer'],
          enabled: true,
        },
      });
      const batchUserId = assertString(batchUser.id, 'batch user id');
      batchUserIds.add(batchUserId);
      batchUsers.push({
        id: batchUserId,
        username: batchUsername,
      });
    }

    await apiRequest('/core/users/batch/status', {
      method: 'PATCH',
      expected: [400],
      body: {
        userIds: [],
        enabled: false,
      },
    });
    await apiRequest('/core/users/batch/status', {
      method: 'PATCH',
      expected: [400],
      body: {
        userIds: [batchUsers[0].id, batchUsers[0].id],
        enabled: false,
      },
    });
    await apiRequest('/core/users/batch/status', {
      method: 'PATCH',
      expected: [400],
      body: {
        userIds: [adminUserId],
        enabled: false,
      },
    });
    await apiRequest('/core/users/batch/status', {
      method: 'PATCH',
      expected: [404],
      body: {
        userIds: ['missing_user'],
        enabled: false,
      },
    });
    await apiRequest('/core/users/batch', {
      method: 'DELETE',
      expected: [400],
      body: {
        userIds: [batchUsers[0].id, batchUsers[0].id],
      },
    });
    await apiRequest('/core/users/batch', {
      method: 'DELETE',
      expected: [400],
      body: {
        userIds: [adminUserId],
      },
    });

    const batchLogins: any[] = [];
    for (const batchUser of batchUsers) {
      const batchLogin = await loginUser(
        batchUser.username,
        batchPassword,
        [200, 201],
      );
      batchLogins.push({
        username: batchUser.username,
        token: assertString(batchLogin.accessToken, 'batch accessToken'),
      });
    }

    const batchDisabled = await apiRequest('/core/users/batch/status', {
      method: 'PATCH',
      body: {
        userIds: batchUsers.map((user) => user.id),
        enabled: false,
      },
    });
    assertEqual(batchDisabled.affected, 2, 'batch disabled affected count');
    assertEqual(batchDisabled.enabled, false, 'batch disabled status');
    assertEqual(
      batchDisabled.revokedSessionCount,
      2,
      'batch disable revoked session count',
    );
    for (const batchLogin of batchLogins) {
      await request(`${apiPrefix}/auth/me`, {
        token: batchLogin.token,
        expected: [401],
      });
      await loginUser(batchLogin.username, batchPassword, [401]);
      assertUserOptionNotIncludesUsername(
        await apiRequest('/core/users/simple-list'),
        batchLogin.username,
        'batch disabled simple-list user options',
      );
    }

    const batchEnabled = await apiRequest('/core/users/batch/status', {
      method: 'PATCH',
      body: {
        userIds: batchUsers.map((user) => user.id),
        enabled: true,
      },
    });
    assertEqual(batchEnabled.affected, 2, 'batch enabled affected count');
    assertEqual(batchEnabled.enabled, true, 'batch enabled status');
    for (const batchUser of batchUsers) {
      assertUserOptionIncludesUsername(
        await apiRequest('/core/users/simple-list'),
        batchUser.username,
        'batch enabled simple-list user options',
      );
    }

    const batchDeleteLogins: any[] = [];
    for (const batchUser of batchUsers) {
      const batchLogin = await loginUser(
        batchUser.username,
        batchPassword,
        [200, 201],
      );
      batchDeleteLogins.push({
        username: batchUser.username,
        token: assertString(batchLogin.accessToken, 'batch delete accessToken'),
      });
    }
    const batchDeleted = await apiRequest('/core/users/batch', {
      method: 'DELETE',
      body: {
        userIds: batchUsers.map((user) => user.id),
      },
    });
    assertEqual(batchDeleted.deleted, true, 'batch deleted result');
    assertEqual(batchDeleted.affected, 2, 'batch deleted affected count');
    assertEqual(
      batchDeleted.revokedSessionCount,
      2,
      'batch delete revoked session count',
    );
    for (const batchUser of batchUsers) {
      batchUserIds.delete(batchUser.id);
    }
    for (const batchLogin of batchDeleteLogins) {
      await request(`${apiPrefix}/auth/me`, {
        token: batchLogin.token,
        expected: [401],
      });
      await loginUser(batchLogin.username, batchPassword, [401]);
    }

    const initialLogin = await loginSmokeUser(smokePassword, [200, 201]);
    smokeUserToken = assertString(
      initialLogin.accessToken,
      'initial smoke user accessToken',
    );
    assertIncludes(
      initialLogin.user.roleCodes,
      'viewer',
      'initial smoke user roles',
    );

    const disabledUser = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}/status`,
      {
        method: 'PATCH',
        body: { enabled: false },
      },
    );
    assertEqual(disabledUser.enabled, false, 'disabled user status');
    assertUserOptionNotIncludesUsername(
      await apiRequest('/core/users/simple-list'),
      smokeUsername,
      'disabled simple-list user options',
    );
    assertEqual(
      disabledUser.revokedSessionCount,
      1,
      'disable user revoked session count',
    );
    await request(`${apiPrefix}/auth/me`, {
      token: smokeUserToken,
      expected: [401],
    });
    await loginSmokeUser(smokePassword, [401]);

    const enabledUser = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}/status`,
      {
        method: 'PATCH',
        body: { enabled: true },
      },
    );
    assertEqual(enabledUser.enabled, true, 'enabled user status');
    assertUserOptionIncludesUsername(
      await apiRequest('/core/users/simple-list'),
      smokeUsername,
      'enabled simple-list user options',
    );

    const reenabledLogin = await loginSmokeUser(smokePassword, [200, 201]);
    smokeUserToken = assertString(
      reenabledLogin.accessToken,
      'reenabled smoke user accessToken',
    );

    const userRoleAssignment = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}/roles`,
    );
    assertEqual(
      userRoleAssignment.userId,
      smokeUserId,
      'user role assignment user id',
    );
    assertEqual(
      userRoleAssignment.username,
      smokeUsername,
      'user role assignment username',
    );
    assertIncludes(
      userRoleAssignment.roleCodes,
      'viewer',
      'user role assignment initial roles',
    );
    await request(
      `${apiPrefix}/core/users/${encodeURIComponent(smokeUserId)}/roles`,
      {
        token: smokeUserToken,
        expected: [403],
      },
    );
    await request(
      `${apiPrefix}/core/users/${encodeURIComponent(smokeUserId)}/roles`,
      {
        method: 'PATCH',
        token: smokeUserToken,
        expected: [403],
        body: { roleCodes: [] },
      },
    );
    await apiRequest(`/core/users/${encodeURIComponent(adminUserId)}/roles`, {
      method: 'PATCH',
      expected: [400],
      body: { roleCodes: ['viewer'] },
    });
    await apiRequest(`/core/users/${encodeURIComponent(smokeUserId)}/roles`, {
      method: 'PATCH',
      expected: [400],
      body: { roleCodes: ['viewer', 'viewer'] },
    });
    await apiRequest(`/core/users/${encodeURIComponent(smokeUserId)}/roles`, {
      method: 'PATCH',
      expected: [404],
      body: { roleCodes: ['missing_role'] },
    });
    const clearedRoleAssignment = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}/roles`,
      {
        method: 'PATCH',
        body: { roleCodes: [] },
      },
    );
    assertEqual(
      clearedRoleAssignment.revokedSessionCount,
      1,
      'user role assignment revoke session count',
    );
    assertNotIncludes(
      clearedRoleAssignment.roleCodes,
      'viewer',
      'user role assignment cleared roles',
    );
    await request(`${apiPrefix}/auth/me`, {
      token: smokeUserToken,
      expected: [401],
    });
    const roleClearedLogin = await loginSmokeUser(smokePassword, [200, 201]);
    smokeUserToken = assertString(
      roleClearedLogin.accessToken,
      'role-cleared smoke user accessToken',
    );
    assertNotIncludes(
      roleClearedLogin.user.roleCodes,
      'viewer',
      'role-cleared login roles',
    );
    const restoredRoleAssignment = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}/roles`,
      {
        method: 'PATCH',
        body: { roleCodes: ['viewer'] },
      },
    );
    assertEqual(
      restoredRoleAssignment.revokedSessionCount,
      1,
      'user role assignment restore revoke session count',
    );
    assertIncludes(
      restoredRoleAssignment.roleCodes,
      'viewer',
      'user role assignment restored roles',
    );
    await request(`${apiPrefix}/auth/me`, {
      token: smokeUserToken,
      expected: [401],
    });
    const roleRestoredLogin = await loginSmokeUser(smokePassword, [200, 201]);
    smokeUserToken = assertString(
      roleRestoredLogin.accessToken,
      'role-restored smoke user accessToken',
    );
    assertIncludes(
      roleRestoredLogin.user.roleCodes,
      'viewer',
      'role-restored login roles',
    );

    const passwordResetUser = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}/reset-password`,
      {
        method: 'POST',
        body: { password: resetPassword },
      },
    );
    assertEqual(
      passwordResetUser.revokedSessionCount,
      1,
      'reset password revoked session count',
    );
    await request(`${apiPrefix}/auth/me`, {
      token: smokeUserToken,
      expected: [401],
    });
    await loginSmokeUser(smokePassword, [401]);

    const resetLogin = await loginSmokeUser(resetPassword, [200, 201]);
    smokeUserToken = assertString(
      resetLogin.accessToken,
      'reset-password smoke user accessToken',
    );

    await request(`${apiPrefix}/core/users/profile/password`, {
      method: 'PATCH',
      token: smokeUserToken,
      expected: [401],
      body: {
        oldPassword: 'wrong-password',
        newPassword: selfPassword,
      },
    });
    await request(`${apiPrefix}/core/users/profile/password`, {
      method: 'PATCH',
      token: smokeUserToken,
      expected: [400],
      body: {
        oldPassword: resetPassword,
        newPassword: resetPassword,
      },
    });
    const selfPasswordUpdate = await request(
      `${apiPrefix}/core/users/profile/password`,
      {
        method: 'PATCH',
        token: smokeUserToken,
        body: {
          oldPassword: resetPassword,
          newPassword: selfPassword,
        },
      },
    );
    assertEqual(
      selfPasswordUpdate.changed,
      true,
      'self password changed result',
    );
    assertEqual(
      selfPasswordUpdate.revokedSessionCount,
      1,
      'self password change revoked session count',
    );
    await request(`${apiPrefix}/auth/me`, {
      token: smokeUserToken,
      expected: [401],
    });
    await loginSmokeUser(resetPassword, [401]);
    const selfPasswordLogin = await loginSmokeUser(selfPassword, [200, 201]);
    smokeUserToken = assertString(
      selfPasswordLogin.accessToken,
      'self-password smoke user accessToken',
    );

    const updatedUser = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}`,
      {
        method: 'PATCH',
        body: {
          displayName: 'Smoke User Security Updated',
          roleCodes: [],
          deptId: null,
          postCodes: [],
          enabled: true,
        },
      },
    );
    assertEqual(
      updatedUser.revokedSessionCount,
      1,
      'update user revoked session count',
    );
    assertNotIncludes(updatedUser.roleCodes, 'viewer', 'updated user roles');
    assertNotIncludes(updatedUser.postCodes, 'engineer', 'updated user posts');
    await request(`${apiPrefix}/auth/me`, {
      token: smokeUserToken,
      expected: [401],
    });

    const updatedLogin = await loginSmokeUser(selfPassword, [200, 201]);
    smokeUserToken = assertString(
      updatedLogin.accessToken,
      'updated smoke user accessToken',
    );
    assertNotIncludes(
      updatedLogin.user.roleCodes,
      'viewer',
      'updated login roles',
    );

    await apiRequest('/core/roles', {
      method: 'POST',
      body: {
        code: importGuardRoleCode,
        name: 'User Import Create-only Smoke',
        permissionCodes: ['core:user:create'],
        enabled: true,
        dataScope: 'self',
        dataScopeDeptIds: [],
      },
    });
    importGuardRoleCreated = true;
    const importGuardUser = await apiRequest('/core/users', {
      method: 'POST',
      body: {
        username: importGuardUsername,
        displayName: 'User Import Guard Smoke',
        password: importGuardPassword,
        roleCodes: [importGuardRoleCode],
        deptId: 'dept_operations',
        postCodes: [],
        enabled: true,
      },
    });
    importGuardUserId = assertString(
      importGuardUser.id,
      'import guard user id',
    );
    const importGuardLogin = await loginUser(
      importGuardUsername,
      importGuardPassword,
      [200, 201],
    );
    const importGuardToken = assertString(
      importGuardLogin.accessToken,
      'import guard accessToken',
    );
    assertIncludes(
      importGuardLogin.user.permissionCodes,
      'core:user:create',
      'import guard create permission',
    );
    assertNotIncludes(
      importGuardLogin.user.permissionCodes,
      'core:user:import',
      'import guard import permission',
    );
    await request(`${apiPrefix}/core/users/import-template`, {
      token: importGuardToken,
      expected: [403],
    });
    await request(`${apiPrefix}/core/users/import`, {
      method: 'POST',
      token: importGuardToken,
      expected: [403],
      body: {
        contentBase64: createUserImportCsvBase64([
          [
            `${importUsername}_forbidden`,
            'Forbidden Import User',
            importPassword,
            'viewer',
            '',
            '',
            'true',
          ],
        ]),
        updateExisting: false,
      },
    });

    const importTemplate = await apiRequest('/core/users/import-template');
    assertEqual(
      importTemplate.filename,
      'opencore-system-users-import-template.xlsx',
      'user import template filename',
    );
    assertEqual(
      importTemplate.contentType,
      xlsxContentType,
      'user import template MIME type',
    );
    assertIncludes(
      importTemplate.columns,
      'username',
      'user import template columns',
    );
    const importTemplateWorkbook = Buffer.from(
      assertString(importTemplate.contentBase64, 'user import template body'),
      'base64',
    );
    assertEqual(
      importTemplateWorkbook.subarray(0, 2).toString('utf8'),
      'PK',
      'user import template XLSX zip header',
    );
    assertEqual(
      importTemplateWorkbook.length > 1000,
      true,
      'user import template XLSX byte length',
    );
    const xlsxImportResult = await apiRequest('/core/users/import', {
      method: 'POST',
      body: {
        contentBase64: createUserImportXlsxBase64([
          [
            xlsxImportUsername,
            'XLSX Import Smoke User',
            importPassword,
            'viewer',
            'dept_operations',
            'engineer',
            'true',
          ],
        ]),
        updateExisting: false,
      },
    });
    assertEqual(xlsxImportResult.totalRows, 1, 'user XLSX import total rows');
    assertEqual(xlsxImportResult.created, 1, 'user XLSX import created count');
    assertEqual(xlsxImportResult.failed, 0, 'user XLSX import failed count');
    assertIncludes(
      xlsxImportResult.createdUsernames,
      xlsxImportUsername,
      'user XLSX import created usernames',
    );
    const xlsxImportedUser = (await apiRequest('/core/users')).find(
      (user) => user.username === xlsxImportUsername,
    );
    xlsxImportUserId = assertString(
      xlsxImportedUser?.id,
      'XLSX imported user id',
    );
    assertEqual(
      xlsxImportedUser?.deptId,
      'dept_operations',
      'XLSX imported user department',
    );
    assertIncludes(
      xlsxImportedUser?.postCodes ?? [],
      'engineer',
      'XLSX imported user posts',
    );
    assertEqual(xlsxImportedUser?.enabled, true, 'XLSX imported user enabled');
    assertEqual(
      Buffer.from(
        assertString(importTemplate.contentBase64, 'user import template body'),
        'base64',
      )
        .subarray(0, 2)
        .toString('utf8'),
      'PK',
      'user import template binary payload',
    );
    await apiRequest('/core/users/import', {
      method: 'POST',
      expected: [400],
      body: {
        contentBase64: createUserImportCsvBase64([
          [
            importUsername,
            'Import Smoke User',
            importPassword,
            'viewer',
            'dept_operations',
            'engineer',
            'true',
          ],
        ]),
        updateExisting: 'true',
      },
    });
    const importResult = await apiRequest('/core/users/import', {
      method: 'POST',
      body: {
        contentBase64: createUserImportCsvBase64([
          [
            importUsername,
            'Import Smoke User',
            importPassword,
            'viewer',
            'dept_operations',
            'engineer',
            'true',
          ],
          [
            `${importUsername}_bad_role`,
            'Import Bad Role User',
            importPassword,
            'missing_role',
            '',
            '',
            'true',
          ],
        ]),
        updateExisting: false,
      },
    });
    assertEqual(importResult.totalRows, 2, 'user import total rows');
    assertEqual(importResult.created, 1, 'user import created count');
    assertEqual(importResult.failed, 1, 'user import failed count');
    assertIncludes(
      importResult.createdUsernames,
      importUsername,
      'user import created usernames',
    );
    assertEqual(
      importResult.failures[0]?.username,
      `${importUsername}_bad_role`,
      'user import failure username',
    );
    const importedUser = (await apiRequest('/core/users')).find(
      (user) => user.username === importUsername,
    );
    importUserId = assertString(importedUser?.id, 'imported user id');
    const importedLogin = await loginUser(
      importUsername,
      importPassword,
      [200, 201],
    );
    const importedToken = assertString(
      importedLogin.accessToken,
      'imported user accessToken',
    );
    const importUpdateResult = await apiRequest('/core/users/import', {
      method: 'POST',
      body: {
        contentBase64: createUserImportCsvBase64([
          [
            importUsername,
            'Import Smoke User Updated',
            importUpdatedPassword,
            'viewer',
            '',
            '',
            'false',
          ],
        ]),
        updateExisting: true,
      },
    });
    assertEqual(importUpdateResult.updated, 1, 'user import updated count');
    assertEqual(
      importUpdateResult.failed,
      0,
      'user import update failed count',
    );
    assertEqual(
      importUpdateResult.revokedSessionCount,
      1,
      'user import update revoked session count',
    );
    await request(`${apiPrefix}/auth/me`, {
      token: importedToken,
      expected: [401],
    });
    assertUserOptionNotIncludesUsername(
      await apiRequest('/core/users/simple-list'),
      importUsername,
      'import disabled simple-list user options',
    );
    await loginUser(importUsername, importPassword, [401]);
    await loginUser(importUsername, importUpdatedPassword, [401]);

    const deletedUser = await apiRequest(
      `/core/users/${encodeURIComponent(smokeUserId)}`,
      {
        method: 'DELETE',
      },
    );
    assertEqual(deletedUser.deleted, true, 'deleted user result');
    assertEqual(
      deletedUser.revokedSessionCount,
      1,
      'delete user revoked session count',
    );
    await request(`${apiPrefix}/auth/me`, {
      token: smokeUserToken,
      expected: [401],
    });
    await loginSmokeUser(selfPassword, [401]);
    smokeUserId = undefined;

    await cleanup();

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs ? ['openapi.docs-json'] : []),
          'core.user.simple-list.auth-guard',
          'auth.login',
          'core.user.profile.get',
          'core.user.profile.avatar.auth-guard',
          'core.user.profile.avatar.mime-guard',
          'core.user.profile.avatar.bytes-guard',
          'core.user.profile.avatar.size-guard',
          'core.user.profile.avatar.upload',
          'core.user.profile.avatar.public-download',
          'core.user.profile.avatar.auth-me-refresh',
          'core.user.profile.avatar.delete',
          'core.user.profile.avatar.delete-removes-public-download',
          'core.user.profile.update',
          'core.user.profile.auth-me-refresh',
          'core.user.profile.invalid-display-name-guard',
          'core.user.profile.management-system-user-guard',
          'core.user.post.unknown-rejected',
          'core.user.dept.unknown-rejected',
          'core.user.simple-list.dept.unknown-rejected',
          'core.user.create',
          'core.user.simple-list.authenticated-consumer',
          'core.user.simple-list.option-shape',
          'core.user.dept.create',
          'core.user.dept.filter',
          'core.user.dept.subtree-filter',
          'core.user.simple-list.dept-filter',
          'core.user.export.xlsx',
          'core.user.data-scope.self-list',
          'core.user.data-scope.dept-intersection',
          'core.user.data-scope.simple-list',
          'core.user.data-scope.export',
          'core.user.post.create',
          'core.user.batch-status.empty-guard',
          'core.user.batch-status.duplicate-guard',
          'core.user.batch-status.system-user-guard',
          'core.user.batch-status.missing-user-guard',
          'core.user.batch-delete.duplicate-guard',
          'core.user.batch-delete.system-user-guard',
          'core.user.batch-status.disable',
          'core.user.batch-status.revoke-sessions',
          'core.user.batch-status.login-blocked',
          'core.user.batch-status.enable',
          'core.user.batch-delete',
          'core.user.batch-delete.revoke-sessions',
          'core.user.batch-delete.login-blocked',
          'core.user.status.disable',
          'core.user.simple-list.disabled-filtered',
          'core.user.status.revoke-session',
          'core.user.status.login-blocked',
          'core.user.status.enable',
          'core.user.simple-list.enabled-filter',
          'core.user.role-assignment.get',
          'core.user.role-assignment.permission-guard',
          'core.user.role-assignment.system-user-guard',
          'core.user.role-assignment.duplicate-role-guard',
          'core.user.role-assignment.missing-role-guard',
          'core.user.role-assignment.clear',
          'core.user.role-assignment.revoke-session',
          'core.user.role-assignment.login-refresh',
          'core.user.role-assignment.restore',
          'core.user.role-assignment.restore-revoke-session',
          'core.user.reset-password',
          'core.user.reset-password.revoke-session',
          'core.user.reset-password.old-password-blocked',
          'core.user.profile.password.wrong-old-password-guard',
          'core.user.profile.password.same-password-guard',
          'core.user.profile.password.update',
          'core.user.profile.password.revoke-session',
          'core.user.profile.password.old-password-blocked',
          'core.user.profile.password.new-password-login',
          'core.user.post.clear',
          'core.user.update.revoke-session',
          'core.user.import.permission-split',
          'core.user.import-template',
          'core.user.import.xlsx',
          'core.user.import.update-existing-boolean-guard',
          'core.user.import.partial-result',
          'core.user.import.update-revoke-session',
          'core.user.import.enabled-filter',
          'core.user.delete.revoke-session',
        ],
      }),
    );
  } catch (error) {
    await cleanup().catch(() => undefined);
    console.error(
      JSON.stringify({
        status: 'fail',
        baseUrl,
        apiPrefix,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  }
}

void main();

async function loginSmokeUser(password, expected) {
  return loginUser(smokeUsername, password, expected);
}

async function loginUser(loginUsername, loginPassword, expected) {
  return request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected,
    body: {
      username: loginUsername,
      password: loginPassword,
    },
  });
}

async function captureAvatarUpload(avatarUrl) {
  if (!avatarUrl) {
    return undefined;
  }

  const downloaded = await requestBuffer(avatarUrl, { expected: [200] });
  const mimeType = normalizeContentType(downloaded.headers.get('content-type'));
  const extension = extensionByMimeType[mimeType];

  if (!extension) {
    throw new Error(`Unsupported existing admin avatar MIME type: ${mimeType}`);
  }

  return {
    body: downloaded.body,
    originalName: `restored-admin-avatar.${extension}`,
    mimeType,
  };
}

function createAvatarUploadForm(
  body: Buffer,
  mimeType: string,
  originalName: string,
) {
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(body)], { type: mimeType }),
    originalName,
  );
  return form;
}

async function cleanup() {
  if (!adminToken) {
    return;
  }

  await cleanupSmokeUserSessions();
  await restoreAdminProfile();

  if (smokeUserId) {
    await apiRequest(`/core/users/${encodeURIComponent(smokeUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    smokeUserId = undefined;
  }

  if (dataScopeUserId) {
    await apiRequest(`/core/users/${encodeURIComponent(dataScopeUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    dataScopeUserId = undefined;
  }

  if (importGuardUserId) {
    await apiRequest(`/core/users/${encodeURIComponent(importGuardUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    importGuardUserId = undefined;
  }

  if (importUserId) {
    await apiRequest(`/core/users/${encodeURIComponent(importUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    importUserId = undefined;
  }

  if (xlsxImportUserId) {
    await apiRequest(`/core/users/${encodeURIComponent(xlsxImportUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    xlsxImportUserId = undefined;
  }

  for (const batchUserId of [...batchUserIds]) {
    await apiRequest(`/core/users/${encodeURIComponent(batchUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    batchUserIds.delete(batchUserId);
  }

  if (importGuardRoleCreated) {
    await apiRequest(`/core/roles/${encodeURIComponent(importGuardRoleCode)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    importGuardRoleCreated = false;
  }

  if (dataScopeRoleCreated) {
    await apiRequest(`/core/roles/${encodeURIComponent(dataScopeRoleCode)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    dataScopeRoleCreated = false;
  }
}

async function restoreAdminProfile() {
  if (originalAdminDisplayName) {
    await apiRequest('/core/users/profile', {
      method: 'PATCH',
      expected: [200, 201],
      body: {
        displayName: originalAdminDisplayName,
      },
    }).catch(() => undefined);
    originalAdminDisplayName = undefined;
  }

  if (!adminAvatarTouched) {
    return;
  }

  if (originalAdminAvatarUpload) {
    await apiRequest('/core/users/profile/avatar', {
      method: 'POST',
      expected: [200, 201],
      body: createAvatarUploadForm(
        originalAdminAvatarUpload.body,
        originalAdminAvatarUpload.mimeType,
        originalAdminAvatarUpload.originalName,
      ),
    }).catch(() => undefined);
  } else {
    await apiRequest('/core/users/profile/avatar', {
      method: 'DELETE',
      expected: [200, 201, 404],
    }).catch(() => undefined);
  }

  adminAvatarTouched = false;
}

async function cleanupSmokeUserSessions() {
  for (const sessionUsername of [
    smokeUsername,
    dataScopeUsername,
    importUsername,
    xlsxImportUsername,
    importGuardUsername,
    ...batchUsernames,
  ]) {
    await cleanupUserSessions(sessionUsername);
  }
}

async function cleanupUserSessions(sessionUsername) {
  const page = await apiRequest(
    `/monitor/online-users?username=${encodeURIComponent(
      sessionUsername,
    )}&active=true&page=1&pageSize=100`,
    {
      expected: [200, 404],
    },
  ).catch(() => undefined);

  if (!page || !Array.isArray(page.items)) {
    return;
  }

  const ids = page.items
    .filter((session) => session.username === sessionUsername)
    .map((session) => session.id);

  if (ids.length === 0) {
    return;
  }

  await apiRequest('/monitor/online-users/kick-out', {
    method: 'POST',
    body: {
      ids,
      actor: 'core.user.smoke',
      reason: `cleanup smoke user sessions for ${sessionUsername}`,
    },
    expected: [200, 404],
  }).catch(() => undefined);
}

async function requestBuffer(path: string, options: any = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const expected = options.expected || [200];

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      signal: controller.signal,
    });
    const responseBody = Buffer.from(await response.arrayBuffer());

    if (!expected.includes(response.status)) {
      throw new HttpStatusError(
        `${options.method || 'GET'} ${path} returned ${response.status}: ${responseBody
          .toString('utf8')
          .slice(0, 500)}`,
        response.status,
      );
    }

    return {
      body: responseBody,
      headers: response.headers,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${path} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function createUserImportCsvBase64(rows) {
  const csvRows = [
    [
      'username',
      'displayName',
      'password',
      'roleCodes',
      'deptId',
      'postCodes',
      'enabled',
    ],
    ...rows,
  ];

  return Buffer.from(
    csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\n'),
    'utf8',
  ).toString('base64');
}

function createUserImportXlsxBase64(rows) {
  const worksheetRows = [
    [
      'username',
      'displayName',
      'password',
      'roleCodes',
      'deptId',
      'postCodes',
      'enabled',
    ],
    ...rows,
  ];
  const workbook = zipSync(
    {
      '[Content_Types].xml': strToU8(createXlsxContentTypesXml()),
      '_rels/.rels': strToU8(createXlsxRootRelationshipsXml()),
      'xl/workbook.xml': strToU8(createXlsxWorkbookXml()),
      'xl/_rels/workbook.xml.rels': strToU8(
        createXlsxWorkbookRelationshipsXml(),
      ),
      'xl/worksheets/sheet1.xml': strToU8(
        createXlsxWorksheetXml(worksheetRows),
      ),
    },
    { level: 6 },
  );

  return Buffer.from(workbook).toString('base64');
}

function createXlsxContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
}

function createXlsxRootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function createXlsxWorkbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Users" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
}

function createXlsxWorkbookRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
}

function createXlsxWorksheetXml(rows) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const excelRow = rowIndex + 1;
      const cellXml = row
        .map((value, columnIndex) => {
          const style = rowIndex === 0 ? ' s="1"' : '';
          return `<c r="${columnIndexToName(columnIndex)}${excelRow}" t="inlineStr"${style}><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join('');

      return `<row r="${excelRow}">${cellXml}</row>`;
    })
    .join('');
  const lastColumn = columnIndexToName(Math.max(rows[0]?.length ?? 1, 1) - 1);
  const lastRow = Math.max(rows.length, 1);
  const range = `A1:${lastColumn}${lastRow}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${range}"/>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="${range}"/>
</worksheet>`;
}

function columnIndexToName(index) {
  let remaining = index + 1;
  let name = '';

  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    name = String.fromCharCode(65 + modulo) + name;
    remaining = Math.floor((remaining - modulo) / 26);
  }

  return name;
}

function escapeXml(value) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsvCell(value) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function assertUserListIncludesUsername(users, expectedUsername, label) {
  if (!Array.isArray(users)) {
    throw new Error(`Expected ${label} to be an array`);
  }

  if (!users.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} to include ${expectedUsername}`);
  }
}

function assertUserListNotIncludesUsername(users, expectedUsername, label) {
  if (!Array.isArray(users)) {
    throw new Error(`Expected ${label} to be an array`);
  }

  if (users.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} not to include ${expectedUsername}`);
  }
}

function findUserOption(options, username) {
  assertArray(options, 'user options');
  const option = options.find((user) => user.username === username);

  if (!option) {
    throw new Error(`Expected user options to include ${username}`);
  }

  return option;
}

function assertUserOptionIncludesUsername(options, expectedUsername, label) {
  assertArray(options, label);

  if (!options.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} to include ${expectedUsername}`);
  }
}

function assertUserOptionNotIncludesUsername(options, expectedUsername, label) {
  assertArray(options, label);

  if (options.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} not to include ${expectedUsername}`);
  }
}

function assertBufferEqual(actual, expected, label) {
  if (!actual.equals(expected)) {
    throw new Error(
      `Expected ${label} bytes to equal uploaded bytes, got ${actual.byteLength} bytes`,
    );
  }
}

function normalizeContentType(value) {
  return (value || '').split(';')[0].trim().toLowerCase();
}
