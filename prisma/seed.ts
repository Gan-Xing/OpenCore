import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedAuditLogs, seedLoginLogs } from '@opencore/audit/records';
import { collectPermissionDefinitions } from '@opencore/module-registry';
import { seedOnlineUserSessions as onlineUserSessionSeeds } from '@opencore/online-user/records';
import {
  seedSchedulerJobs,
  seedSchedulerRuns,
} from '@opencore/scheduler/records';
import {
  normalizeStoredConfigValue,
  seedDictTypes,
  seedSystemConfigs,
  seedSystemDepts,
  seedSystemNoticeTemplates,
  seedSystemNotices,
  seedSystemPosts,
  seedSystemRoles,
  seedSystemUsers,
  seedSystemMenus,
  hashSystemUserPassword,
} from '@opencore/system/records';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedFileAssets } from '../apps/api/src/modules/core/system-management/system-management.seed';
import { seedReports } from '../apps/api/src/modules/monitor/operations/operations.seed';
import {
  seedIntegrationOutbox,
  seedIntegrationProviders,
  seedIntegrationTemplates,
} from '../apps/api/src/modules/integration/integration/integration.seed';

const LOCAL_ENV_FILE = '.env.opencore.local';
const BOOTSTRAP_ADMIN_USERNAME = 'admin';
const BOOTSTRAP_ADMIN_ROLE_CODE = 'admin';

loadLocalEnvFile();

const databaseUrl = readDatabaseUrl();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main(): Promise<void> {
  const bootstrapPassword = readBootstrapAdminPassword();

  const permissionCount = await seedPermissions();
  const menuCount = await seedMenus();
  const roleCount = await seedRoles();
  const integrationCount = await seedIntegrations();
  const systemManagementCount = await seedSystemManagement();
  const userCount = await seedUsers(bootstrapPassword);
  const systemNoticeDeliveryCount = await seedSystemNoticeDeliveries();
  const onlineUserSessionCount = await seedOnlineUserSessions();
  const schedulerCount = await seedScheduler();
  const operationsCount = await seedOperations();

  console.log(
    JSON.stringify({
      seeded: {
        permissions: permissionCount,
        menus: menuCount,
        roles: roleCount,
        users: userCount,
        systemNoticeDeliveries: systemNoticeDeliveryCount,
        onlineUserSessions: onlineUserSessionCount,
        integrations: integrationCount,
        scheduler: schedulerCount,
        operations: operationsCount,
        systemManagement: systemManagementCount,
        bootstrapAdminUsername: BOOTSTRAP_ADMIN_USERNAME,
        bootstrapAdminRoleCode: BOOTSTRAP_ADMIN_ROLE_CODE,
      },
    }),
  );
}

async function seedIntegrations(): Promise<{
  providers: number;
  templates: number;
  outbox: number;
}> {
  for (const provider of seedIntegrationProviders) {
    await prisma.integrationProvider.upsert({
      where: { code: provider.code },
      update: {
        type: provider.type,
        name: provider.name,
        enabled: provider.enabled,
        secretRef: provider.secretRef,
        config: provider.config as Prisma.InputJsonValue,
        healthStatus: provider.healthStatus,
        lastCheckedAt: provider.lastCheckedAt
          ? new Date(provider.lastCheckedAt)
          : null,
      },
      create: {
        id: provider.id,
        code: provider.code,
        type: provider.type,
        name: provider.name,
        enabled: provider.enabled,
        secretRef: provider.secretRef,
        config: provider.config as Prisma.InputJsonValue,
        healthStatus: provider.healthStatus,
        lastCheckedAt: provider.lastCheckedAt
          ? new Date(provider.lastCheckedAt)
          : null,
      },
    });
  }

  for (const template of seedIntegrationTemplates) {
    await prisma.integrationTemplate.upsert({
      where: { code: template.code },
      update: {
        channel: template.channel,
        name: template.name,
        subject: template.subject ?? null,
        body: template.body,
        enabled: template.enabled,
      },
      create: {
        id: template.id,
        code: template.code,
        channel: template.channel,
        name: template.name,
        subject: template.subject ?? null,
        body: template.body,
        enabled: template.enabled,
      },
    });
  }

  for (const message of seedIntegrationOutbox) {
    await prisma.integrationOutbox.upsert({
      where: { id: message.id },
      update: {
        channel: message.channel,
        providerCode: message.providerCode,
        templateCode: message.templateCode ?? null,
        recipient: message.recipient,
        subject: message.subject ?? null,
        payload: message.payload as Prisma.InputJsonValue,
        status: message.status,
        retryCount: message.retryCount,
        preview: message.preview ?? null,
        error: message.error ?? null,
        sentAt: message.sentAt ? new Date(message.sentAt) : null,
        createdAt: new Date(message.createdAt),
      },
      create: {
        id: message.id,
        channel: message.channel,
        providerCode: message.providerCode,
        templateCode: message.templateCode ?? null,
        recipient: message.recipient,
        subject: message.subject ?? null,
        payload: message.payload as Prisma.InputJsonValue,
        status: message.status,
        retryCount: message.retryCount,
        preview: message.preview ?? null,
        error: message.error ?? null,
        sentAt: message.sentAt ? new Date(message.sentAt) : null,
        createdAt: new Date(message.createdAt),
      },
    });
  }

  return {
    providers: seedIntegrationProviders.length,
    templates: seedIntegrationTemplates.length,
    outbox: seedIntegrationOutbox.length,
  };
}

async function seedOnlineUserSessions(): Promise<number> {
  for (const session of onlineUserSessionSeeds) {
    await prisma.onlineUserSession.upsert({
      where: { id: session.id },
      update: {
        username: session.username,
        tokenId: session.tokenId,
        ip: session.ip,
        userAgent: session.userAgent,
        lastSeenAt: new Date(session.lastSeenAt),
        expiresAt: new Date(session.expiresAt),
        revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
        revokedBy: session.revokedBy,
        revokedReason: session.revokedReason,
      },
      create: {
        id: session.id,
        username: session.username,
        tokenId: session.tokenId,
        ip: session.ip,
        userAgent: session.userAgent,
        lastSeenAt: new Date(session.lastSeenAt),
        expiresAt: new Date(session.expiresAt),
        revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
        revokedBy: session.revokedBy,
        revokedReason: session.revokedReason,
      },
    });
  }

  return onlineUserSessionSeeds.length;
}

async function seedScheduler(): Promise<{
  jobs: number;
  jobRuns: number;
}> {
  for (const job of seedSchedulerJobs) {
    await prisma.jobDefinition.upsert({
      where: { code: job.code },
      update: {
        name: job.name,
        queueName: job.queueName,
        cron: job.cron,
        enabled: job.enabled,
        retryLimit: job.retryLimit,
        timeoutSeconds: job.timeoutSeconds,
        payload: job.payload as Prisma.InputJsonValue,
      },
      create: {
        id: job.id,
        code: job.code,
        name: job.name,
        queueName: job.queueName,
        cron: job.cron,
        enabled: job.enabled,
        retryLimit: job.retryLimit,
        timeoutSeconds: job.timeoutSeconds,
        payload: job.payload as Prisma.InputJsonValue,
      },
    });
  }

  for (const run of seedSchedulerRuns) {
    await prisma.jobRunLog.upsert({
      where: { id: run.id },
      update: {
        jobCode: run.jobCode,
        status: run.status,
        trigger: run.trigger,
        attempts: run.attempts,
        durationMs: run.durationMs ?? null,
        startedAt: new Date(run.startedAt),
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
        error: run.error,
        metadata: run.metadata as Prisma.InputJsonValue,
      },
      create: {
        id: run.id,
        jobCode: run.jobCode,
        status: run.status,
        trigger: run.trigger,
        attempts: run.attempts,
        durationMs: run.durationMs ?? null,
        startedAt: new Date(run.startedAt),
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
        error: run.error,
        metadata: run.metadata as Prisma.InputJsonValue,
      },
    });
  }

  return {
    jobs: seedSchedulerJobs.length,
    jobRuns: seedSchedulerRuns.length,
  };
}

async function seedOperations(): Promise<{ reports: number }> {
  for (const report of seedReports) {
    await prisma.reportDefinition.upsert({
      where: { code: report.code },
      update: {
        name: report.name,
        description: report.description ?? null,
        querySchema: report.querySchema as Prisma.InputJsonValue,
        enabled: report.enabled,
        owner: report.owner,
      },
      create: {
        id: report.id,
        code: report.code,
        name: report.name,
        description: report.description ?? null,
        querySchema: report.querySchema as Prisma.InputJsonValue,
        enabled: report.enabled,
        owner: report.owner,
      },
    });
  }

  return { reports: seedReports.length };
}

async function seedPermissions(): Promise<number> {
  const permissions = collectPermissionDefinitions();

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { title: permission.title },
      create: {
        code: permission.code,
        title: permission.title,
      },
    });
  }

  return permissions.length;
}

async function seedMenus(): Promise<number> {
  const menus = seedSystemMenus;

  for (const menu of menus) {
    const permission = menu.permissionCode
      ? await prisma.permission.findUnique({
          where: { code: menu.permissionCode },
        })
      : null;

    await prisma.menu.upsert({
      where: { key: menu.key },
      update: {
        parentKey: menu.parentKey ?? null,
        title: menu.title,
        type: menu.type,
        path: menu.path,
        icon: menu.icon ?? null,
        component: menu.component ?? null,
        order: menu.order,
        status: menu.status,
        cache: menu.cache,
        hidden: menu.hidden,
        permissionId: permission?.id ?? null,
      },
      create: {
        key: menu.key,
        parentKey: menu.parentKey ?? null,
        title: menu.title,
        type: menu.type,
        path: menu.path,
        icon: menu.icon ?? null,
        component: menu.component ?? null,
        order: menu.order,
        status: menu.status,
        cache: menu.cache,
        hidden: menu.hidden,
        permissionId: permission?.id ?? null,
      },
    });
  }

  return menus.length;
}

async function seedRoles(): Promise<number> {
  const roles = seedSystemRoles;

  for (const roleDefinition of roles) {
    const role = await prisma.role.upsert({
      where: { code: roleDefinition.code },
      update: {
        name: roleDefinition.name,
        enabled: roleDefinition.enabled,
        system: roleDefinition.system,
        dataScope: roleDefinition.dataScope,
        dataScopeDeptIds: [
          ...roleDefinition.dataScopeDeptIds,
        ] as Prisma.InputJsonValue,
      },
      create: {
        code: roleDefinition.code,
        name: roleDefinition.name,
        enabled: roleDefinition.enabled,
        system: roleDefinition.system,
        dataScope: roleDefinition.dataScope,
        dataScopeDeptIds: [
          ...roleDefinition.dataScopeDeptIds,
        ] as Prisma.InputJsonValue,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: { code: { in: [...roleDefinition.permissionCodes] } },
      select: { id: true },
    });
    const desiredPermissionIds = permissions.map((permission) => permission.id);

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: desiredPermissionIds },
      },
    });

    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  return roles.length;
}

async function seedUsers(bootstrapPassword: string): Promise<number> {
  for (const userDefinition of seedSystemUsers) {
    const passwordHash =
      userDefinition.username === BOOTSTRAP_ADMIN_USERNAME
        ? hashSystemUserPassword(bootstrapPassword)
        : userDefinition.passwordHash;
    await assertSeedUserDeptExists(userDefinition.deptId);
    await assertSeedUserPostsExist(userDefinition.postCodes);
    const user = await prisma.user.upsert({
      where: { username: userDefinition.username },
      update: {
        displayName: userDefinition.displayName,
        passwordHash,
        deptId: userDefinition.deptId ?? null,
        enabled: userDefinition.enabled,
      },
      create: {
        id: userDefinition.id,
        username: userDefinition.username,
        displayName: userDefinition.displayName,
        passwordHash,
        deptId: userDefinition.deptId,
        enabled: userDefinition.enabled,
      },
    });
    const roles = await prisma.role.findMany({
      where: { code: { in: [...userDefinition.roleCodes] } },
      select: { id: true, code: true },
    });
    const knownRoleCodes = new Set(roles.map((role) => role.code));
    const missingRoleCode = userDefinition.roleCodes.find(
      (roleCode) => !knownRoleCodes.has(roleCode),
    );

    if (missingRoleCode) {
      throw new Error(`Seed user role not found: ${missingRoleCode}`);
    }

    const desiredRoleIds = roles.map((role) => role.id);

    await prisma.userRole.deleteMany({
      where: {
        userId: user.id,
        roleId: { notIn: desiredRoleIds },
      },
    });

    for (const role of roles) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    const posts = await prisma.systemPost.findMany({
      where: { code: { in: [...userDefinition.postCodes] } },
      select: { id: true, code: true },
    });
    const knownPostCodes = new Set(posts.map((post) => post.code));
    const missingPostCode = userDefinition.postCodes.find(
      (postCode) => !knownPostCodes.has(postCode),
    );

    if (missingPostCode) {
      throw new Error(`Seed user post not found: ${missingPostCode}`);
    }

    const desiredPostIds = posts.map((post) => post.id);

    await prisma.userPost.deleteMany({
      where: {
        userId: user.id,
        postId: { notIn: desiredPostIds },
      },
    });

    for (const post of posts) {
      await prisma.userPost.upsert({
        where: {
          userId_postId: {
            userId: user.id,
            postId: post.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          postId: post.id,
        },
      });
    }
  }

  return seedSystemUsers.length;
}

async function seedSystemNoticeDeliveries(): Promise<number> {
  let count = 0;

  for (const notice of seedSystemNotices) {
    if (notice.status !== 'published') {
      continue;
    }

    for (const seedUser of seedSystemUsers.filter(
      (candidate) => candidate.enabled,
    )) {
      const user = await prisma.user.findUnique({
        where: { username: seedUser.username },
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      });

      if (!user) {
        throw new Error(
          `Seed notice delivery user not found: ${seedUser.username}`,
        );
      }

      const deliveredAt = new Date(notice.publishedAt ?? notice.createdAt);
      await prisma.systemNoticeDelivery.upsert({
        where: {
          noticeId_userId_channel: {
            noticeId: notice.id,
            userId: user.id,
            channel: 'in_app',
          },
        },
        update: {
          username: user.username,
          displayName: user.displayName,
          title: notice.title,
          content: notice.content,
          type: notice.type,
          audience: notice.audience,
          provider: 'in_app.local',
          providerStatus: 'sent',
          attemptCount: 1,
          lastAttemptAt: deliveredAt,
          sentAt: deliveredAt,
          lastError: null,
        },
        create: {
          id: `notice_delivery_${notice.id}_${user.id}`,
          noticeId: notice.id,
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          channel: 'in_app',
          status: 'delivered',
          provider: 'in_app.local',
          providerStatus: 'sent',
          attemptCount: 1,
          title: notice.title,
          content: notice.content,
          type: notice.type,
          audience: notice.audience,
          deliveredAt,
          lastAttemptAt: deliveredAt,
          sentAt: deliveredAt,
          lastError: null,
          createdAt: deliveredAt,
        },
      });
      count += 1;
    }
  }

  return count;
}

async function assertSeedUserDeptExists(
  deptId: string | undefined,
): Promise<void> {
  if (!deptId) {
    return;
  }

  const dept = await prisma.systemDept.findUnique({
    where: { id: deptId },
    select: { id: true },
  });

  if (!dept) {
    throw new Error(`Seed user dept not found: ${deptId}`);
  }
}

async function assertSeedUserPostsExist(
  postCodes: readonly string[],
): Promise<void> {
  if (postCodes.length === 0) {
    return;
  }

  const posts = await prisma.systemPost.findMany({
    where: { code: { in: [...postCodes] } },
    select: { code: true },
  });
  const existing = new Set(posts.map((post) => post.code));
  const missing = postCodes.find((postCode) => !existing.has(postCode));

  if (missing) {
    throw new Error(`Seed user post not found: ${missing}`);
  }
}

async function seedSystemManagement(): Promise<{
  dictTypes: number;
  systemConfigs: number;
  systemNotices: number;
  systemNoticeTemplates: number;
  systemDepts: number;
  systemPosts: number;
  fileAssets: number;
  auditLogs: number;
  loginLogs: number;
}> {
  for (const dict of seedDictTypes) {
    const dictType = await prisma.dictType.upsert({
      where: { code: dict.code },
      update: {
        name: dict.name,
        description: dict.description,
        enabled: dict.enabled,
      },
      create: {
        id: dict.id,
        code: dict.code,
        name: dict.name,
        description: dict.description,
        enabled: dict.enabled,
      },
    });
    const seedValues = dict.items.map((item) => item.value);

    await prisma.dictItem.deleteMany({
      where: {
        typeId: dictType.id,
        value: { notIn: seedValues },
      },
    });

    for (const item of dict.items) {
      await prisma.dictItem.upsert({
        where: {
          typeId_value: {
            typeId: dictType.id,
            value: item.value,
          },
        },
        update: {
          label: item.label,
          sort: item.sort,
          enabled: item.enabled,
        },
        create: {
          id: item.id,
          typeId: dictType.id,
          label: item.label,
          value: item.value,
          sort: item.sort,
          enabled: item.enabled,
        },
      });
    }
  }

  for (const config of seedSystemConfigs) {
    const storedConfigValue = normalizeStoredConfigValue({
      key: config.key,
      value: config.value,
      valueType: config.valueType,
      visibility: config.visibility,
    });
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {
        category: config.category,
        name: config.name,
        value: storedConfigValue,
        valueType: config.valueType,
        description: config.description,
        remark: config.remark,
        public: config.public,
        system: config.system,
      },
      create: {
        id: config.id,
        category: config.category,
        name: config.name,
        key: config.key,
        value: storedConfigValue,
        valueType: config.valueType,
        description: config.description,
        remark: config.remark,
        public: config.public,
        system: config.system,
      },
    });
  }

  for (const notice of seedSystemNotices) {
    await prisma.systemNotice.upsert({
      where: { id: notice.id },
      update: {
        title: notice.title,
        content: notice.content,
        type: notice.type,
        status: notice.status,
        audience: notice.audience,
        pinned: notice.pinned,
        validFrom: notice.validFrom ? new Date(notice.validFrom) : null,
        validTo: notice.validTo ? new Date(notice.validTo) : null,
        publishedAt: notice.publishedAt ? new Date(notice.publishedAt) : null,
        archivedAt: notice.archivedAt ? new Date(notice.archivedAt) : null,
        createdBy: notice.createdBy,
        createdAt: new Date(notice.createdAt),
      },
      create: {
        id: notice.id,
        title: notice.title,
        content: notice.content,
        type: notice.type,
        status: notice.status,
        audience: notice.audience,
        pinned: notice.pinned,
        validFrom: notice.validFrom ? new Date(notice.validFrom) : null,
        validTo: notice.validTo ? new Date(notice.validTo) : null,
        publishedAt: notice.publishedAt ? new Date(notice.publishedAt) : null,
        archivedAt: notice.archivedAt ? new Date(notice.archivedAt) : null,
        createdBy: notice.createdBy,
        createdAt: new Date(notice.createdAt),
      },
    });
  }

  for (const template of seedSystemNoticeTemplates) {
    await prisma.systemNoticeTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        type: template.type,
        titleTemplate: template.titleTemplate,
        contentTemplate: template.contentTemplate,
        params: [...template.params] as Prisma.InputJsonValue,
        enabled: template.enabled,
        remark: template.remark,
        createdAt: new Date(template.createdAt),
      },
      create: {
        id: template.id,
        code: template.code,
        name: template.name,
        type: template.type,
        titleTemplate: template.titleTemplate,
        contentTemplate: template.contentTemplate,
        params: [...template.params] as Prisma.InputJsonValue,
        enabled: template.enabled,
        remark: template.remark,
        createdAt: new Date(template.createdAt),
      },
    });
  }

  for (const dept of seedSystemDepts) {
    await prisma.systemDept.upsert({
      where: { code: dept.code },
      update: {
        name: dept.name,
        parentId: dept.parentId,
        order: dept.order,
        leader: dept.leader,
        phone: dept.phone,
        email: dept.email,
        enabled: dept.enabled,
        createdAt: new Date(dept.createdAt),
      },
      create: {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        parentId: dept.parentId,
        order: dept.order,
        leader: dept.leader,
        phone: dept.phone,
        email: dept.email,
        enabled: dept.enabled,
        createdAt: new Date(dept.createdAt),
      },
    });
  }

  for (const post of seedSystemPosts) {
    await prisma.systemPost.upsert({
      where: { code: post.code },
      update: {
        name: post.name,
        order: post.order,
        description: post.description,
        enabled: post.enabled,
        createdAt: new Date(post.createdAt),
      },
      create: {
        id: post.id,
        code: post.code,
        name: post.name,
        order: post.order,
        description: post.description,
        enabled: post.enabled,
        createdAt: new Date(post.createdAt),
      },
    });
  }

  for (const file of seedFileAssets) {
    await prisma.fileAsset.upsert({
      where: { id: file.id },
      update: {
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        checksum: file.checksum,
        uploadedBy: file.uploadedBy,
      },
      create: {
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        checksum: file.checksum,
        uploadedBy: file.uploadedBy,
        createdAt: new Date(file.createdAt),
      },
    });
  }

  for (const auditLog of seedAuditLogs) {
    await prisma.auditLog.upsert({
      where: { id: auditLog.id },
      update: {
        actorUsername: auditLog.actorUsername,
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        method: auditLog.method,
        path: auditLog.path,
        statusCode: auditLog.statusCode,
        ip: auditLog.ip,
        userAgent: auditLog.userAgent,
        requestId: auditLog.requestId,
        metadata: auditLog.metadata as Prisma.InputJsonValue,
        createdAt: new Date(auditLog.createdAt),
      },
      create: {
        id: auditLog.id,
        actorUsername: auditLog.actorUsername,
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        method: auditLog.method,
        path: auditLog.path,
        statusCode: auditLog.statusCode,
        ip: auditLog.ip,
        userAgent: auditLog.userAgent,
        requestId: auditLog.requestId,
        metadata: auditLog.metadata as Prisma.InputJsonValue,
        createdAt: new Date(auditLog.createdAt),
      },
    });
  }

  for (const loginLog of seedLoginLogs) {
    await prisma.loginLog.upsert({
      where: { id: loginLog.id },
      update: {
        username: loginLog.username,
        logType: loginLog.logType,
        result: loginLog.result,
        success: loginLog.success,
        failureReason: loginLog.failureReason,
        actorUsername: loginLog.actorUsername,
        reason: loginLog.reason,
        ip: loginLog.ip,
        location: loginLog.location,
        userAgent: loginLog.userAgent,
        requestId: loginLog.requestId,
        createdAt: new Date(loginLog.createdAt),
      },
      create: {
        id: loginLog.id,
        username: loginLog.username,
        logType: loginLog.logType,
        result: loginLog.result,
        success: loginLog.success,
        failureReason: loginLog.failureReason,
        actorUsername: loginLog.actorUsername,
        reason: loginLog.reason,
        ip: loginLog.ip,
        location: loginLog.location,
        userAgent: loginLog.userAgent,
        requestId: loginLog.requestId,
        createdAt: new Date(loginLog.createdAt),
      },
    });
  }

  return {
    dictTypes: seedDictTypes.length,
    systemConfigs: seedSystemConfigs.length,
    systemNotices: seedSystemNotices.length,
    systemNoticeTemplates: seedSystemNoticeTemplates.length,
    systemDepts: seedSystemDepts.length,
    systemPosts: seedSystemPosts.length,
    fileAssets: seedFileAssets.length,
    auditLogs: seedAuditLogs.length,
    loginLogs: seedLoginLogs.length,
  };
}

function loadLocalEnvFile(): void {
  const envPath = resolve(process.cwd(), LOCAL_ENV_FILE);

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const separatorIndex = normalized.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = stripEnvQuotes(normalized.slice(separatorIndex + 1).trim());

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set before running prisma:seed');
  }

  const normalized = databaseUrl.toLowerCase();

  if (normalized.includes('nestweb')) {
    throw new Error('DATABASE_URL must not target a NestWeb database');
  }

  if (!normalized.includes('opencore')) {
    throw new Error('DATABASE_URL must target an OpenCore database boundary');
  }

  return databaseUrl;
}

function readBootstrapAdminPassword(): string {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters for prisma:seed',
    );
  }

  if (isPlaceholder(password)) {
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD must be a local value, not a placeholder',
    );
  }

  return password;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('<') ||
    normalized.includes('>') ||
    normalized.includes('change-me') ||
    normalized.includes('local-bootstrap')
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
