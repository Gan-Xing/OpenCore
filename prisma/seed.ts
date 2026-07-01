import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedAuditLogs, seedLoginLogs } from '@opencore/audit/records';
import {
  collectPermissionDefinitions,
  listModules,
} from '@opencore/module-registry';
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
import {
  seedApprovalLiteRequests,
  seedMessages,
  seedNotices,
  seedTodos,
} from '../apps/api/src/modules/collaboration/collaboration/collaboration.seed';
import {
  seedTicketAttachments,
  seedTicketCategories,
  seedTicketComments,
  seedTicketTransitions,
  seedTickets,
} from '../apps/api/src/modules/collaboration/ticket/ticket.seed';
import {
  seedCrmAttachments,
  seedCrmAuditEvents,
  seedCrmContacts,
  seedCrmCustomers,
  seedCrmFollowUps,
  seedCrmLeads,
  seedCrmOpportunities,
  seedCrmOwnerTransfers,
  seedCrmTags,
  seedCrmTasks,
} from '../apps/api/src/modules/business/core/crm.seed';
import { seedReports } from '../apps/api/src/modules/monitor/operations/operations.seed';
import {
  seedIntegrationOutbox,
  seedIntegrationOAuthTokens,
  seedIntegrationProviders,
  seedIntegrationTemplates,
  type IntegrationProviderRecord,
} from '../apps/api/src/modules/integration/integration/integration.seed';

const LOCAL_ENV_FILE = '.env.opencore.local';
const BOOTSTRAP_ADMIN_USERNAME = 'admin';
const BOOTSTRAP_ADMIN_ROLE_CODE = 'admin';
const ROOT_TENANT_ID = 'tenant_root';
const ROOT_TENANT_PLAN_ID = 'tenant_plan_system_full';
const PLATFORM_ADMIN_ROLE_ID = 'platform_role_admin';
const OAUTH_RUNTIME_PROVIDERS = [
  {
    code: 'oauth.github',
    configId: 'config_integration_oauth_github_client_secret',
    configKey: 'integration.oauth.github.client-secret.secret',
    envPrefix: 'GITHUB',
    name: 'GitHub OAuth client secret',
    remark:
      'Runtime OAuth adapters resolve this value only through secretRef; the raw GitHub client secret stays in local environment variables.',
  },
  {
    code: 'oauth.google',
    configId: 'config_integration_oauth_google_client_secret',
    configKey: 'integration.oauth.google.client-secret.secret',
    envPrefix: 'GOOGLE',
    name: 'Google OAuth client secret',
    remark:
      'Runtime social login resolves this value only through secretRef; the raw Google client secret stays in local environment variables.',
  },
  {
    code: 'oauth.microsoft',
    configId: 'config_integration_oauth_microsoft_client_secret',
    configKey: 'integration.oauth.microsoft.client-secret.secret',
    envPrefix: 'MICROSOFT',
    name: 'Microsoft OAuth client secret',
    remark:
      'Runtime social login resolves this value only through secretRef; the raw Microsoft client secret stays in local environment variables.',
  },
] as const;

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
  const tenancyCount = await seedTenancy();
  const systemNoticeDeliveryCount = await seedSystemNoticeDeliveries();
  const onlineUserSessionCount = await seedOnlineUserSessions();
  const schedulerCount = await seedScheduler();
  const operationsCount = await seedOperations();
  const collaborationCount = await seedCollaboration();
  const crmCount = await seedCrm();

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
        collaboration: collaborationCount,
        crm: crmCount,
        scheduler: schedulerCount,
        operations: operationsCount,
        systemManagement: systemManagementCount,
        tenancy: tenancyCount,
        bootstrapAdminUsername: BOOTSTRAP_ADMIN_USERNAME,
        bootstrapAdminRoleCode: BOOTSTRAP_ADMIN_ROLE_CODE,
      },
    }),
  );
}

async function seedTenancy(): Promise<{
  tenants: number;
  tenantPlans: number;
  tenantPlanModules: number;
  tenantMemberships: number;
  tenantMembershipRoles: number;
  tenantMembershipPosts: number;
  platformRoles: number;
  userPlatformRoles: number;
  platformRolePermissions: number;
}> {
  const moduleCodes = listModules().map(
    (moduleDefinition) => moduleDefinition.code,
  );
  const platformPermissionCodes = collectPermissionDefinitions()
    .map((permission) => permission.code)
    .filter((code) => code.startsWith('platform:tenant'));

  await prisma.tenantPlan.upsert({
    where: { code: 'system.full' },
    update: {
      name: 'System Full',
      enabled: true,
      limits: { accountLimit: 1000 },
      remark: 'Built-in full plan for the default root tenant.',
    },
    create: {
      id: ROOT_TENANT_PLAN_ID,
      code: 'system.full',
      name: 'System Full',
      enabled: true,
      limits: { accountLimit: 1000 },
      remark: 'Built-in full plan for the default root tenant.',
    },
  });

  for (const moduleCode of moduleCodes) {
    await prisma.tenantPlanModule.upsert({
      where: {
        planId_moduleCode: {
          planId: ROOT_TENANT_PLAN_ID,
          moduleCode,
        },
      },
      update: {},
      create: {
        planId: ROOT_TENANT_PLAN_ID,
        moduleCode,
      },
    });
  }

  await prisma.tenantPlanModule.deleteMany({
    where: {
      planId: ROOT_TENANT_PLAN_ID,
      moduleCode: { notIn: moduleCodes },
    },
  });

  const adminUser = await prisma.user.findUnique({
    where: { username: BOOTSTRAP_ADMIN_USERNAME },
    select: { id: true },
  });

  await prisma.tenant.upsert({
    where: { code: 'root' },
    update: {
      slug: 'root',
      name: 'Root Tenant',
      status: 'active',
      planId: ROOT_TENANT_PLAN_ID,
      contactName: 'OpenCore Admin',
      accountLimit: 1000,
      createdByUserId: adminUser?.id ?? null,
    },
    create: {
      id: ROOT_TENANT_ID,
      code: 'root',
      slug: 'root',
      name: 'Root Tenant',
      status: 'active',
      planId: ROOT_TENANT_PLAN_ID,
      contactName: 'OpenCore Admin',
      accountLimit: 1000,
      createdByUserId: adminUser?.id ?? null,
    },
  });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      enabled: true,
      deptId: true,
      createdAt: true,
    },
  });

  for (const user of users) {
    await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: ROOT_TENANT_ID,
          userId: user.id,
        },
      },
      update: {
        status: user.enabled ? 'active' : 'suspended',
        isOwner: user.username === BOOTSTRAP_ADMIN_USERNAME,
        deptId: user.deptId,
      },
      create: {
        id: `tenant_membership_root_${user.id}`,
        tenantId: ROOT_TENANT_ID,
        userId: user.id,
        status: user.enabled ? 'active' : 'suspended',
        isOwner: user.username === BOOTSTRAP_ADMIN_USERNAME,
        deptId: user.deptId,
        joinedAt: user.createdAt,
      },
    });
  }

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: ROOT_TENANT_ID },
    select: { id: true, userId: true },
  });
  const membershipIdByUserId = new Map(
    memberships.map((membership) => [membership.userId, membership.id]),
  );

  const userRoles = await prisma.userRole.findMany({
    select: { roleId: true, userId: true },
  });
  for (const userRole of userRoles) {
    const membershipId = membershipIdByUserId.get(userRole.userId);

    if (!membershipId) {
      continue;
    }

    await prisma.tenantMembershipRole.upsert({
      where: {
        tenantId_membershipId_roleId: {
          tenantId: ROOT_TENANT_ID,
          membershipId,
          roleId: userRole.roleId,
        },
      },
      update: {},
      create: {
        tenantId: ROOT_TENANT_ID,
        membershipId,
        roleId: userRole.roleId,
      },
    });
  }

  const userPosts = await prisma.userPost.findMany({
    select: { postId: true, userId: true },
  });
  for (const userPost of userPosts) {
    const membershipId = membershipIdByUserId.get(userPost.userId);

    if (!membershipId) {
      continue;
    }

    await prisma.tenantMembershipPost.upsert({
      where: {
        tenantId_membershipId_postId: {
          tenantId: ROOT_TENANT_ID,
          membershipId,
          postId: userPost.postId,
        },
      },
      update: {},
      create: {
        tenantId: ROOT_TENANT_ID,
        membershipId,
        postId: userPost.postId,
      },
    });
  }

  await prisma.platformRole.upsert({
    where: { code: 'platform-admin' },
    update: {
      name: 'Platform Administrator',
      enabled: true,
      system: true,
    },
    create: {
      id: PLATFORM_ADMIN_ROLE_ID,
      code: 'platform-admin',
      name: 'Platform Administrator',
      enabled: true,
      system: true,
    },
  });

  if (adminUser) {
    await prisma.userPlatformRole.upsert({
      where: {
        userId_platformRoleId: {
          userId: adminUser.id,
          platformRoleId: PLATFORM_ADMIN_ROLE_ID,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        platformRoleId: PLATFORM_ADMIN_ROLE_ID,
      },
    });
  }

  const platformPermissions = await prisma.permission.findMany({
    where: { code: { in: platformPermissionCodes } },
    select: { id: true },
  });
  const desiredPermissionIds = platformPermissions.map(
    (permission) => permission.id,
  );

  await prisma.platformRolePermission.deleteMany({
    where: {
      platformRoleId: PLATFORM_ADMIN_ROLE_ID,
      permissionId: { notIn: desiredPermissionIds },
    },
  });

  for (const permission of platformPermissions) {
    await prisma.platformRolePermission.upsert({
      where: {
        platformRoleId_permissionId: {
          platformRoleId: PLATFORM_ADMIN_ROLE_ID,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        platformRoleId: PLATFORM_ADMIN_ROLE_ID,
        permissionId: permission.id,
      },
    });
  }

  return {
    tenants: 1,
    tenantPlans: 1,
    tenantPlanModules: moduleCodes.length,
    tenantMemberships: users.length,
    tenantMembershipRoles: userRoles.length,
    tenantMembershipPosts: userPosts.length,
    platformRoles: 1,
    userPlatformRoles: adminUser ? 1 : 0,
    platformRolePermissions: platformPermissions.length,
  };
}

async function seedIntegrations(): Promise<{
  providers: number;
  templates: number;
  outbox: number;
  oauthTokens: number;
}> {
  for (const seedProvider of seedIntegrationProviders) {
    const provider = applyRuntimeIntegrationProviderEnv(seedProvider);

    await prisma.integrationProvider.upsert({
      where: {
        tenantId_code: { tenantId: ROOT_TENANT_ID, code: provider.code },
      },
      update: {
        tenantId: ROOT_TENANT_ID,
        type: provider.type,
        name: provider.name,
        enabled: provider.enabled,
        secretRef: provider.secretRef,
        secretRefStatus: provider.secretRefStatus,
        config: provider.config as Prisma.InputJsonValue,
        configVersion: provider.configVersion,
        healthStatus: provider.healthStatus,
        lastCheckedAt: provider.lastCheckedAt
          ? new Date(provider.lastCheckedAt)
          : null,
        lastTestStatus: provider.lastTestStatus ?? null,
        lastTestMessage: provider.lastTestMessage ?? null,
        lastTestedAt: provider.lastTestedAt
          ? new Date(provider.lastTestedAt)
          : null,
      },
      create: {
        id: provider.id,
        tenantId: ROOT_TENANT_ID,
        code: provider.code,
        type: provider.type,
        name: provider.name,
        enabled: provider.enabled,
        secretRef: provider.secretRef,
        secretRefStatus: provider.secretRefStatus,
        config: provider.config as Prisma.InputJsonValue,
        configVersion: provider.configVersion,
        healthStatus: provider.healthStatus,
        lastCheckedAt: provider.lastCheckedAt
          ? new Date(provider.lastCheckedAt)
          : null,
        lastTestStatus: provider.lastTestStatus ?? null,
        lastTestMessage: provider.lastTestMessage ?? null,
        lastTestedAt: provider.lastTestedAt
          ? new Date(provider.lastTestedAt)
          : null,
      },
    });
  }

  for (const template of seedIntegrationTemplates) {
    await prisma.integrationTemplate.upsert({
      where: {
        tenantId_code: { tenantId: ROOT_TENANT_ID, code: template.code },
      },
      update: {
        tenantId: ROOT_TENANT_ID,
        channel: template.channel,
        name: template.name,
        subject: template.subject ?? null,
        body: template.body,
        enabled: template.enabled,
      },
      create: {
        id: template.id,
        tenantId: ROOT_TENANT_ID,
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
    const attachments = message.attachments
      ? toInputJson(message.attachments)
      : Prisma.JsonNull;

    await prisma.integrationOutbox.upsert({
      where: { id: message.id },
      update: {
        tenantId: ROOT_TENANT_ID,
        channel: message.channel,
        providerCode: message.providerCode,
        templateCode: message.templateCode ?? null,
        recipient: message.recipient,
        subject: message.subject ?? null,
        payload: message.payload as Prisma.InputJsonValue,
        attachments,
        status: message.status,
        retryCount: message.retryCount,
        preview: message.preview ?? null,
        error: message.error ?? null,
        sentAt: message.sentAt ? new Date(message.sentAt) : null,
        createdAt: new Date(message.createdAt),
      },
      create: {
        id: message.id,
        tenantId: ROOT_TENANT_ID,
        channel: message.channel,
        providerCode: message.providerCode,
        templateCode: message.templateCode ?? null,
        recipient: message.recipient,
        subject: message.subject ?? null,
        payload: message.payload as Prisma.InputJsonValue,
        attachments,
        status: message.status,
        retryCount: message.retryCount,
        preview: message.preview ?? null,
        error: message.error ?? null,
        sentAt: message.sentAt ? new Date(message.sentAt) : null,
        createdAt: new Date(message.createdAt),
      },
    });
  }

  for (const token of seedIntegrationOAuthTokens) {
    await prisma.integrationOAuthToken.upsert({
      where: { id: token.id },
      update: {
        tenantId: ROOT_TENANT_ID,
        providerCode: token.providerCode,
        subjectType: token.subjectType,
        subjectId: token.subjectId,
        providerAccountId: token.providerAccountId,
        scopes: token.scopes as Prisma.InputJsonValue,
        accessTokenRef: token.accessTokenRef,
        refreshTokenRef: token.refreshTokenRef ?? null,
        status: token.status,
        expiresAt: token.expiresAt ? new Date(token.expiresAt) : null,
        lastRotatedAt: token.lastRotatedAt
          ? new Date(token.lastRotatedAt)
          : null,
        revokedAt: token.revokedAt ? new Date(token.revokedAt) : null,
        revokedBy: token.revokedBy ?? null,
        revokeReason: token.revokeReason ?? null,
        createdAt: new Date(token.createdAt),
      },
      create: {
        id: token.id,
        tenantId: ROOT_TENANT_ID,
        providerCode: token.providerCode,
        subjectType: token.subjectType,
        subjectId: token.subjectId,
        providerAccountId: token.providerAccountId,
        scopes: token.scopes as Prisma.InputJsonValue,
        accessTokenRef: token.accessTokenRef,
        refreshTokenRef: token.refreshTokenRef ?? null,
        status: token.status,
        expiresAt: token.expiresAt ? new Date(token.expiresAt) : null,
        lastRotatedAt: token.lastRotatedAt
          ? new Date(token.lastRotatedAt)
          : null,
        revokedAt: token.revokedAt ? new Date(token.revokedAt) : null,
        revokedBy: token.revokedBy ?? null,
        revokeReason: token.revokeReason ?? null,
        createdAt: new Date(token.createdAt),
      },
    });
  }

  return {
    providers: seedIntegrationProviders.length,
    templates: seedIntegrationTemplates.length,
    outbox: seedIntegrationOutbox.length,
    oauthTokens: seedIntegrationOAuthTokens.length,
  };
}

async function seedCollaboration(): Promise<{
  approvals: number;
  messages: number;
  notices: number;
  ticketAttachments: number;
  ticketCategories: number;
  ticketComments: number;
  ticketTransitions: number;
  tickets: number;
  todos: number;
}> {
  for (const message of seedMessages) {
    await prisma.collaborationMessage.upsert({
      where: { id: message.id },
      update: {
        tenantId: message.tenantId,
        title: message.title,
        body: message.body,
        sender: message.sender,
        recipient: message.recipient,
        status: message.status,
        businessType: message.businessType ?? null,
        businessId: message.businessId ?? null,
        readAt: message.readAt ? new Date(message.readAt) : null,
        archivedAt: message.archivedAt ? new Date(message.archivedAt) : null,
        deletedAt: message.deletedAt ? new Date(message.deletedAt) : null,
        createdAt: new Date(message.createdAt),
      },
      create: {
        id: message.id,
        tenantId: message.tenantId,
        title: message.title,
        body: message.body,
        sender: message.sender,
        recipient: message.recipient,
        status: message.status,
        businessType: message.businessType ?? null,
        businessId: message.businessId ?? null,
        readAt: message.readAt ? new Date(message.readAt) : null,
        archivedAt: message.archivedAt ? new Date(message.archivedAt) : null,
        deletedAt: message.deletedAt ? new Date(message.deletedAt) : null,
        createdAt: new Date(message.createdAt),
      },
    });
  }

  for (const notice of seedNotices) {
    await prisma.collaborationNotice.upsert({
      where: { id: notice.id },
      update: {
        tenantId: notice.tenantId,
        title: notice.title,
        body: notice.body,
        status: notice.status,
        targetAudience: notice.targetAudience as Prisma.InputJsonValue,
        validFrom: notice.validFrom ? new Date(notice.validFrom) : null,
        validTo: notice.validTo ? new Date(notice.validTo) : null,
        publishedAt: notice.publishedAt ? new Date(notice.publishedAt) : null,
        archivedAt: notice.archivedAt ? new Date(notice.archivedAt) : null,
        createdBy: notice.createdBy,
        createdAt: new Date(notice.createdAt),
      },
      create: {
        id: notice.id,
        tenantId: notice.tenantId,
        title: notice.title,
        body: notice.body,
        status: notice.status,
        targetAudience: notice.targetAudience as Prisma.InputJsonValue,
        validFrom: notice.validFrom ? new Date(notice.validFrom) : null,
        validTo: notice.validTo ? new Date(notice.validTo) : null,
        publishedAt: notice.publishedAt ? new Date(notice.publishedAt) : null,
        archivedAt: notice.archivedAt ? new Date(notice.archivedAt) : null,
        createdBy: notice.createdBy,
        createdAt: new Date(notice.createdAt),
      },
    });
  }

  for (const todo of seedTodos) {
    await prisma.collaborationTodo.upsert({
      where: { id: todo.id },
      update: {
        tenantId: todo.tenantId,
        title: todo.title,
        description: todo.description ?? null,
        sourceType: todo.sourceType,
        businessType: todo.businessType ?? null,
        businessId: todo.businessId ?? null,
        assignee: todo.assignee,
        status: todo.status,
        timeline: toInputJson(todo.timeline),
        completedAt: todo.completedAt ? new Date(todo.completedAt) : null,
        canceledAt: todo.canceledAt ? new Date(todo.canceledAt) : null,
        createdAt: new Date(todo.createdAt),
      },
      create: {
        id: todo.id,
        tenantId: todo.tenantId,
        title: todo.title,
        description: todo.description ?? null,
        sourceType: todo.sourceType,
        businessType: todo.businessType ?? null,
        businessId: todo.businessId ?? null,
        assignee: todo.assignee,
        status: todo.status,
        timeline: toInputJson(todo.timeline),
        completedAt: todo.completedAt ? new Date(todo.completedAt) : null,
        canceledAt: todo.canceledAt ? new Date(todo.canceledAt) : null,
        createdAt: new Date(todo.createdAt),
      },
    });
  }

  for (const approval of seedApprovalLiteRequests) {
    await prisma.collaborationApprovalLite.upsert({
      where: { id: approval.id },
      update: {
        tenant: { connect: { id: approval.tenantId } },
        title: approval.title,
        requester: approval.requester,
        approver: approval.approver,
        businessType: approval.businessType ?? null,
        businessId: approval.businessId ?? null,
        status: approval.status,
        comment: approval.comment ?? null,
        timeline: toInputJson(approval.timeline),
        decidedAt: approval.decidedAt ? new Date(approval.decidedAt) : null,
        createdAt: new Date(approval.createdAt),
      },
      create: {
        id: approval.id,
        tenant: { connect: { id: approval.tenantId } },
        title: approval.title,
        requester: approval.requester,
        approver: approval.approver,
        businessType: approval.businessType ?? null,
        businessId: approval.businessId ?? null,
        status: approval.status,
        comment: approval.comment ?? null,
        timeline: toInputJson(approval.timeline),
        decidedAt: approval.decidedAt ? new Date(approval.decidedAt) : null,
        createdAt: new Date(approval.createdAt),
      },
    });
  }

  for (const category of seedTicketCategories) {
    await prisma.ticketCategory.upsert({
      where: { id: category.id },
      update: {
        tenantId: category.tenantId,
        code: category.code,
        name: category.name,
        description: category.description ?? null,
        enabled: category.enabled,
        order: category.order,
        createdAt: new Date(category.createdAt),
      },
      create: {
        id: category.id,
        tenantId: category.tenantId,
        code: category.code,
        name: category.name,
        description: category.description ?? null,
        enabled: category.enabled,
        order: category.order,
        createdAt: new Date(category.createdAt),
      },
    });
  }

  for (const ticket of seedTickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {
        tenantId: ticket.tenantId,
        number: ticket.number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        categoryId: ticket.categoryId ?? null,
        createdBy: ticket.createdBy,
        assignee: ticket.assignee ?? null,
        dueAt: ticket.dueAt ? new Date(ticket.dueAt) : null,
        firstRespondedAt: ticket.firstRespondedAt
          ? new Date(ticket.firstRespondedAt)
          : null,
        responseDueAt: ticket.responseDueAt
          ? new Date(ticket.responseDueAt)
          : null,
        resolutionDueAt: ticket.resolutionDueAt
          ? new Date(ticket.resolutionDueAt)
          : null,
        slaBreached: ticket.slaBreached,
        slaNotifiedAt: ticket.slaNotifiedAt
          ? new Date(ticket.slaNotifiedAt)
          : null,
        resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : null,
        closedAt: ticket.closedAt ? new Date(ticket.closedAt) : null,
        archivedAt: ticket.archivedAt ? new Date(ticket.archivedAt) : null,
        createdAt: new Date(ticket.createdAt),
      },
      create: {
        id: ticket.id,
        tenantId: ticket.tenantId,
        number: ticket.number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        categoryId: ticket.categoryId ?? null,
        createdBy: ticket.createdBy,
        assignee: ticket.assignee ?? null,
        dueAt: ticket.dueAt ? new Date(ticket.dueAt) : null,
        firstRespondedAt: ticket.firstRespondedAt
          ? new Date(ticket.firstRespondedAt)
          : null,
        responseDueAt: ticket.responseDueAt
          ? new Date(ticket.responseDueAt)
          : null,
        resolutionDueAt: ticket.resolutionDueAt
          ? new Date(ticket.resolutionDueAt)
          : null,
        slaBreached: ticket.slaBreached,
        slaNotifiedAt: ticket.slaNotifiedAt
          ? new Date(ticket.slaNotifiedAt)
          : null,
        resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : null,
        closedAt: ticket.closedAt ? new Date(ticket.closedAt) : null,
        archivedAt: ticket.archivedAt ? new Date(ticket.archivedAt) : null,
        createdAt: new Date(ticket.createdAt),
      },
    });
  }

  for (const comment of seedTicketComments) {
    await prisma.ticketComment.upsert({
      where: { id: comment.id },
      update: {
        tenantId: comment.tenantId,
        ticketId: comment.ticketId,
        author: comment.author,
        body: comment.body,
        createdAt: new Date(comment.createdAt),
      },
      create: {
        id: comment.id,
        tenantId: comment.tenantId,
        ticketId: comment.ticketId,
        author: comment.author,
        body: comment.body,
        createdAt: new Date(comment.createdAt),
      },
    });
  }

  for (const transition of seedTicketTransitions) {
    await prisma.ticketTransition.upsert({
      where: { id: transition.id },
      update: {
        tenantId: transition.tenantId,
        ticketId: transition.ticketId,
        fromStatus: transition.fromStatus ?? null,
        toStatus: transition.toStatus,
        actor: transition.actor,
        comment: transition.comment ?? null,
        createdAt: new Date(transition.createdAt),
      },
      create: {
        id: transition.id,
        tenantId: transition.tenantId,
        ticketId: transition.ticketId,
        fromStatus: transition.fromStatus ?? null,
        toStatus: transition.toStatus,
        actor: transition.actor,
        comment: transition.comment ?? null,
        createdAt: new Date(transition.createdAt),
      },
    });
  }

  for (const attachment of seedTicketAttachments) {
    await prisma.ticketAttachment.upsert({
      where: { id: attachment.id },
      update: {
        tenantId: attachment.tenantId,
        ticketId: attachment.ticketId,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        storageKey: attachment.storageKey,
        uploadedBy: attachment.uploadedBy,
        createdAt: new Date(attachment.createdAt),
      },
      create: {
        id: attachment.id,
        tenantId: attachment.tenantId,
        ticketId: attachment.ticketId,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        storageKey: attachment.storageKey,
        uploadedBy: attachment.uploadedBy,
        createdAt: new Date(attachment.createdAt),
      },
    });
  }

  return {
    approvals: seedApprovalLiteRequests.length,
    messages: seedMessages.length,
    notices: seedNotices.length,
    ticketAttachments: seedTicketAttachments.length,
    ticketCategories: seedTicketCategories.length,
    ticketComments: seedTicketComments.length,
    ticketTransitions: seedTicketTransitions.length,
    tickets: seedTickets.length,
    todos: seedTodos.length,
  };
}

async function seedCrm(): Promise<{
  attachments: number;
  auditEvents: number;
  contacts: number;
  customers: number;
  followUps: number;
  leads: number;
  opportunities: number;
  ownerTransfers: number;
  tags: number;
  tasks: number;
}> {
  for (const tag of seedCrmTags) {
    await prisma.crmTag.upsert({
      where: { id: tag.id },
      update: {
        tenantId: tag.tenantId,
        code: tag.code,
        name: tag.name,
        color: tag.color ?? null,
        description: tag.description ?? null,
        enabled: tag.enabled,
        createdAt: new Date(tag.createdAt),
      },
      create: {
        id: tag.id,
        tenantId: tag.tenantId,
        code: tag.code,
        name: tag.name,
        color: tag.color ?? null,
        description: tag.description ?? null,
        enabled: tag.enabled,
        createdAt: new Date(tag.createdAt),
      },
    });
  }

  for (const lead of seedCrmLeads) {
    await prisma.crmLead.upsert({
      where: { id: lead.id },
      update: {
        tenantId: lead.tenantId,
        number: lead.number,
        name: lead.name,
        company: lead.company ?? null,
        mobile: lead.mobile ?? null,
        email: lead.email ?? null,
        source: lead.source,
        status: lead.status,
        rating: lead.rating,
        owner: lead.owner,
        tags: toInputJson(lead.tags),
        remark: lead.remark ?? null,
        nextContactAt: lead.nextContactAt ? new Date(lead.nextContactAt) : null,
        lastFollowedAt: lead.lastFollowedAt
          ? new Date(lead.lastFollowedAt)
          : null,
        convertedCustomerId: lead.convertedCustomerId ?? null,
        convertedOpportunityId: lead.convertedOpportunityId ?? null,
        convertedAt: lead.convertedAt ? new Date(lead.convertedAt) : null,
        archivedAt: lead.archivedAt ? new Date(lead.archivedAt) : null,
        createdAt: new Date(lead.createdAt),
      },
      create: {
        id: lead.id,
        tenantId: lead.tenantId,
        number: lead.number,
        name: lead.name,
        company: lead.company ?? null,
        mobile: lead.mobile ?? null,
        email: lead.email ?? null,
        source: lead.source,
        status: lead.status,
        rating: lead.rating,
        owner: lead.owner,
        tags: toInputJson(lead.tags),
        remark: lead.remark ?? null,
        nextContactAt: lead.nextContactAt ? new Date(lead.nextContactAt) : null,
        lastFollowedAt: lead.lastFollowedAt
          ? new Date(lead.lastFollowedAt)
          : null,
        convertedCustomerId: lead.convertedCustomerId ?? null,
        convertedOpportunityId: lead.convertedOpportunityId ?? null,
        convertedAt: lead.convertedAt ? new Date(lead.convertedAt) : null,
        archivedAt: lead.archivedAt ? new Date(lead.archivedAt) : null,
        createdAt: new Date(lead.createdAt),
      },
    });
  }

  for (const customer of seedCrmCustomers) {
    await prisma.crmCustomer.upsert({
      where: { id: customer.id },
      update: {
        tenantId: customer.tenantId,
        number: customer.number,
        name: customer.name,
        owner: customer.owner,
        status: customer.status,
        level: customer.level,
        source: customer.source,
        industry: customer.industry ?? null,
        region: customer.region ?? null,
        website: customer.website ?? null,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        address: customer.address ?? null,
        tags: toInputJson(customer.tags),
        remark: customer.remark ?? null,
        nextContactAt: customer.nextContactAt
          ? new Date(customer.nextContactAt)
          : null,
        lastFollowedAt: customer.lastFollowedAt
          ? new Date(customer.lastFollowedAt)
          : null,
        archivedAt: customer.archivedAt ? new Date(customer.archivedAt) : null,
        createdAt: new Date(customer.createdAt),
      },
      create: {
        id: customer.id,
        tenantId: customer.tenantId,
        number: customer.number,
        name: customer.name,
        owner: customer.owner,
        status: customer.status,
        level: customer.level,
        source: customer.source,
        industry: customer.industry ?? null,
        region: customer.region ?? null,
        website: customer.website ?? null,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        address: customer.address ?? null,
        tags: toInputJson(customer.tags),
        remark: customer.remark ?? null,
        nextContactAt: customer.nextContactAt
          ? new Date(customer.nextContactAt)
          : null,
        lastFollowedAt: customer.lastFollowedAt
          ? new Date(customer.lastFollowedAt)
          : null,
        archivedAt: customer.archivedAt ? new Date(customer.archivedAt) : null,
        createdAt: new Date(customer.createdAt),
      },
    });
  }

  for (const contact of seedCrmContacts) {
    await prisma.crmContact.upsert({
      where: { id: contact.id },
      update: {
        tenantId: contact.tenantId,
        customerId: contact.customerId,
        name: contact.name,
        title: contact.title ?? null,
        mobile: contact.mobile ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        owner: contact.owner,
        decisionRole: contact.decisionRole ?? null,
        primary: contact.primary,
        remark: contact.remark ?? null,
        nextContactAt: contact.nextContactAt
          ? new Date(contact.nextContactAt)
          : null,
        lastFollowedAt: contact.lastFollowedAt
          ? new Date(contact.lastFollowedAt)
          : null,
        archivedAt: contact.archivedAt ? new Date(contact.archivedAt) : null,
        createdAt: new Date(contact.createdAt),
      },
      create: {
        id: contact.id,
        tenantId: contact.tenantId,
        customerId: contact.customerId,
        name: contact.name,
        title: contact.title ?? null,
        mobile: contact.mobile ?? null,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        owner: contact.owner,
        decisionRole: contact.decisionRole ?? null,
        primary: contact.primary,
        remark: contact.remark ?? null,
        nextContactAt: contact.nextContactAt
          ? new Date(contact.nextContactAt)
          : null,
        lastFollowedAt: contact.lastFollowedAt
          ? new Date(contact.lastFollowedAt)
          : null,
        archivedAt: contact.archivedAt ? new Date(contact.archivedAt) : null,
        createdAt: new Date(contact.createdAt),
      },
    });
  }

  for (const opportunity of seedCrmOpportunities) {
    await prisma.crmOpportunity.upsert({
      where: { id: opportunity.id },
      update: {
        tenantId: opportunity.tenantId,
        customerId: opportunity.customerId,
        number: opportunity.number,
        name: opportunity.name,
        owner: opportunity.owner,
        stage: opportunity.stage,
        amount: new Prisma.Decimal(opportunity.amount),
        probability: opportunity.probability,
        expectedCloseAt: opportunity.expectedCloseAt
          ? new Date(opportunity.expectedCloseAt)
          : null,
        closedAt: opportunity.closedAt ? new Date(opportunity.closedAt) : null,
        closeReason: opportunity.closeReason ?? null,
        tags: toInputJson(opportunity.tags),
        remark: opportunity.remark ?? null,
        archivedAt: opportunity.archivedAt
          ? new Date(opportunity.archivedAt)
          : null,
        createdAt: new Date(opportunity.createdAt),
      },
      create: {
        id: opportunity.id,
        tenantId: opportunity.tenantId,
        customerId: opportunity.customerId,
        number: opportunity.number,
        name: opportunity.name,
        owner: opportunity.owner,
        stage: opportunity.stage,
        amount: new Prisma.Decimal(opportunity.amount),
        probability: opportunity.probability,
        expectedCloseAt: opportunity.expectedCloseAt
          ? new Date(opportunity.expectedCloseAt)
          : null,
        closedAt: opportunity.closedAt ? new Date(opportunity.closedAt) : null,
        closeReason: opportunity.closeReason ?? null,
        tags: toInputJson(opportunity.tags),
        remark: opportunity.remark ?? null,
        archivedAt: opportunity.archivedAt
          ? new Date(opportunity.archivedAt)
          : null,
        createdAt: new Date(opportunity.createdAt),
      },
    });
  }

  for (const followUp of seedCrmFollowUps) {
    await prisma.crmFollowUp.upsert({
      where: { id: followUp.id },
      update: {
        tenantId: followUp.tenantId,
        targetType: followUp.targetType,
        targetId: followUp.targetId,
        method: followUp.method,
        content: followUp.content,
        outcome: followUp.outcome ?? null,
        nextContactAt: followUp.nextContactAt
          ? new Date(followUp.nextContactAt)
          : null,
        createdBy: followUp.createdBy,
        createdAt: new Date(followUp.createdAt),
      },
      create: {
        id: followUp.id,
        tenantId: followUp.tenantId,
        targetType: followUp.targetType,
        targetId: followUp.targetId,
        method: followUp.method,
        content: followUp.content,
        outcome: followUp.outcome ?? null,
        nextContactAt: followUp.nextContactAt
          ? new Date(followUp.nextContactAt)
          : null,
        createdBy: followUp.createdBy,
        createdAt: new Date(followUp.createdAt),
      },
    });
  }

  for (const task of seedCrmTasks) {
    await prisma.crmTask.upsert({
      where: { id: task.id },
      update: {
        tenantId: task.tenantId,
        targetType: task.targetType,
        targetId: task.targetId,
        title: task.title,
        assignee: task.assignee,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt ? new Date(task.dueAt) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        remark: task.remark ?? null,
        createdBy: task.createdBy,
        createdAt: new Date(task.createdAt),
      },
      create: {
        id: task.id,
        tenantId: task.tenantId,
        targetType: task.targetType,
        targetId: task.targetId,
        title: task.title,
        assignee: task.assignee,
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt ? new Date(task.dueAt) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        remark: task.remark ?? null,
        createdBy: task.createdBy,
        createdAt: new Date(task.createdAt),
      },
    });
  }

  for (const attachment of seedCrmAttachments) {
    await prisma.crmAttachment.upsert({
      where: { id: attachment.id },
      update: {
        tenantId: attachment.tenantId,
        targetType: attachment.targetType,
        targetId: attachment.targetId,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        storageKey: attachment.storageKey,
        uploadedBy: attachment.uploadedBy,
        createdAt: new Date(attachment.createdAt),
      },
      create: {
        id: attachment.id,
        tenantId: attachment.tenantId,
        targetType: attachment.targetType,
        targetId: attachment.targetId,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        storageKey: attachment.storageKey,
        uploadedBy: attachment.uploadedBy,
        createdAt: new Date(attachment.createdAt),
      },
    });
  }

  for (const transfer of seedCrmOwnerTransfers) {
    await prisma.crmOwnerTransfer.upsert({
      where: { id: transfer.id },
      update: {
        tenantId: transfer.tenantId,
        targetType: transfer.targetType,
        targetId: transfer.targetId,
        fromOwner: transfer.fromOwner ?? null,
        toOwner: transfer.toOwner,
        actor: transfer.actor,
        reason: transfer.reason ?? null,
        createdAt: new Date(transfer.createdAt),
      },
      create: {
        id: transfer.id,
        tenantId: transfer.tenantId,
        targetType: transfer.targetType,
        targetId: transfer.targetId,
        fromOwner: transfer.fromOwner ?? null,
        toOwner: transfer.toOwner,
        actor: transfer.actor,
        reason: transfer.reason ?? null,
        createdAt: new Date(transfer.createdAt),
      },
    });
  }

  for (const event of seedCrmAuditEvents) {
    await prisma.crmAuditEvent.upsert({
      where: { id: event.id },
      update: {
        tenantId: event.tenantId,
        targetType: event.targetType,
        targetId: event.targetId,
        action: event.action,
        actor: event.actor,
        detail: toInputJson(event.detail),
        createdAt: new Date(event.createdAt),
      },
      create: {
        id: event.id,
        tenantId: event.tenantId,
        targetType: event.targetType,
        targetId: event.targetId,
        action: event.action,
        actor: event.actor,
        detail: toInputJson(event.detail),
        createdAt: new Date(event.createdAt),
      },
    });
  }

  return {
    attachments: seedCrmAttachments.length,
    auditEvents: seedCrmAuditEvents.length,
    contacts: seedCrmContacts.length,
    customers: seedCrmCustomers.length,
    followUps: seedCrmFollowUps.length,
    leads: seedCrmLeads.length,
    opportunities: seedCrmOpportunities.length,
    ownerTransfers: seedCrmOwnerTransfers.length,
    tags: seedCrmTags.length,
    tasks: seedCrmTasks.length,
  };
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function seedOnlineUserSessions(): Promise<number> {
  for (const session of onlineUserSessionSeeds) {
    const rootMembership = await prisma.tenantMembership.findFirst({
      where: {
        tenantId: ROOT_TENANT_ID,
        user: {
          username: session.username,
        },
      },
      select: {
        id: true,
        tenantId: true,
      },
    });
    const tenantId = rootMembership?.tenantId ?? session.tenantId ?? null;
    const membershipId = rootMembership?.id ?? session.membershipId ?? null;

    await prisma.onlineUserSession.upsert({
      where: { id: session.id },
      update: {
        username: session.username,
        tokenId: session.tokenId,
        tenantId,
        membershipId,
        accessMode: session.accessMode ?? 'tenant',
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
        tenantId,
        membershipId,
        accessMode: session.accessMode ?? 'tenant',
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
    const tenantId = job.tenantId ?? ROOT_TENANT_ID;
    await prisma.jobDefinition.upsert({
      where: { tenantId_code: { tenantId, code: job.code } },
      update: {
        tenantId,
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
        tenantId,
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
    const tenantId = run.tenantId ?? ROOT_TENANT_ID;
    await prisma.jobRunLog.upsert({
      where: { id: run.id },
      update: {
        tenantId,
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
        tenantId,
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
      where: {
        tenantId_code: { tenantId: report.tenantId, code: report.code },
      },
      update: {
        tenant: { connect: { id: report.tenantId } },
        name: report.name,
        description: report.description ?? null,
        querySchema: report.querySchema as Prisma.InputJsonValue,
        enabled: report.enabled,
        owner: report.owner,
      },
      create: {
        id: report.id,
        tenant: { connect: { id: report.tenantId } },
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
      where: {
        tenantId_code: {
          tenantId: ROOT_TENANT_ID,
          code: roleDefinition.code,
        },
      },
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
        tenantId: ROOT_TENANT_ID,
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
        mobile: userDefinition.mobile,
        email: userDefinition.email,
        gender: userDefinition.gender,
        passwordHash,
        deptId: userDefinition.deptId,
        enabled: userDefinition.enabled,
        createdAt: new Date(userDefinition.createdAt),
        updatedAt: new Date(userDefinition.updatedAt),
      },
    });
    const roles = await prisma.role.findMany({
      where: {
        tenantId: ROOT_TENANT_ID,
        code: { in: [...userDefinition.roleCodes] },
      },
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
      where: {
        tenantId: ROOT_TENANT_ID,
        code: { in: [...userDefinition.postCodes] },
      },
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
          tenantId_noticeId_userId_channel: {
            tenantId: notice.tenantId,
            noticeId: notice.id,
            userId: user.id,
            channel: 'in_app',
          },
        },
        update: {
          username: user.username,
          displayName: user.displayName,
          title: notice.title,
          tenantId: notice.tenantId,
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
          tenantId: notice.tenantId,
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

  const dept = await prisma.systemDept.findFirst({
    where: { tenantId: ROOT_TENANT_ID, id: deptId },
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
    where: {
      tenantId: ROOT_TENANT_ID,
      code: { in: [...postCodes] },
    },
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
  systemConfigSecretVersions: number;
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
      where: {
        tenantId_code: {
          tenantId: dict.tenantId,
          code: dict.code,
        },
      },
      update: {
        name: dict.name,
        description: dict.description,
        remark: dict.remark,
        enabled: dict.enabled,
        system: dict.system,
        updatedAt: new Date(dict.updatedAt),
      },
      create: {
        id: dict.id,
        tenantId: dict.tenantId,
        code: dict.code,
        name: dict.name,
        description: dict.description,
        remark: dict.remark,
        enabled: dict.enabled,
        system: dict.system,
        createdAt: new Date(dict.createdAt),
        updatedAt: new Date(dict.updatedAt),
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
          colorType: item.colorType,
          cssClass: item.cssClass,
          remark: item.remark,
          updatedAt: new Date(item.updatedAt),
        },
        create: {
          id: item.id,
          typeId: dictType.id,
          label: item.label,
          value: item.value,
          sort: item.sort,
          enabled: item.enabled,
          colorType: item.colorType,
          cssClass: item.cssClass,
          remark: item.remark,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
  }

  let systemConfigSecretVersions = 0;
  const runtimeSystemConfigs = getRuntimeSystemConfigs();
  for (const config of runtimeSystemConfigs) {
    const storedConfigValue = normalizeStoredConfigValue({
      key: config.key,
      value: config.value,
      valueType: config.valueType,
      visibility: config.visibility,
    });
    await prisma.systemConfig.upsert({
      where: {
        tenantId_key: {
          tenantId: config.tenantId,
          key: config.key,
        },
      },
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
        tenantId: config.tenantId,
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
    if (config.visibility === 'secret') {
      await prisma.systemConfigSecretVersion.updateMany({
        where: { tenantId: config.tenantId, key: config.key },
        data: { active: false },
      });
      await prisma.systemConfigSecretVersion.upsert({
        where: {
          tenantId_key_version: {
            tenantId: config.tenantId,
            key: config.key,
            version: 1,
          },
        },
        update: {
          active: true,
          reason: 'Seeded secret baseline.',
          rotatedBy: 'seed',
          value: storedConfigValue,
          valueType: config.valueType,
        },
        create: {
          active: true,
          tenantId: config.tenantId,
          key: config.key,
          reason: 'Seeded secret baseline.',
          rotatedBy: 'seed',
          value: storedConfigValue,
          valueType: config.valueType,
          version: 1,
        },
      });
      systemConfigSecretVersions += 1;
    }
  }

  for (const notice of seedSystemNotices) {
    await prisma.systemNotice.upsert({
      where: { id: notice.id },
      update: {
        tenantId: notice.tenantId,
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
        tenantId: notice.tenantId,
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
      where: {
        tenantId_code: {
          tenantId: template.tenantId,
          code: template.code,
        },
      },
      update: {
        tenantId: template.tenantId,
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
        tenantId: template.tenantId,
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
      where: {
        tenantId_code: {
          tenantId: ROOT_TENANT_ID,
          code: dept.code,
        },
      },
      update: {
        tenantId: ROOT_TENANT_ID,
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
        tenantId: ROOT_TENANT_ID,
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
      where: {
        tenantId_code: {
          tenantId: ROOT_TENANT_ID,
          code: post.code,
        },
      },
      update: {
        name: post.name,
        order: post.order,
        description: post.description,
        enabled: post.enabled,
        createdAt: new Date(post.createdAt),
      },
      create: {
        id: post.id,
        tenantId: ROOT_TENANT_ID,
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
        tenantId: file.tenantId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        checksum: file.checksum,
        uploadedBy: file.uploadedBy,
      },
      create: {
        id: file.id,
        tenantId: file.tenantId,
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
        tenantId: auditLog.tenantId,
        actorUsername: auditLog.actorUsername,
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        method: auditLog.method,
        path: auditLog.path,
        statusCode: auditLog.statusCode,
        ip: auditLog.ip,
        location: auditLog.location,
        userAgent: auditLog.userAgent,
        requestId: auditLog.requestId,
        durationMs: auditLog.durationMs,
        metadata: auditLog.metadata as Prisma.InputJsonValue,
        createdAt: new Date(auditLog.createdAt),
      },
      create: {
        id: auditLog.id,
        tenantId: auditLog.tenantId,
        actorUsername: auditLog.actorUsername,
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        method: auditLog.method,
        path: auditLog.path,
        statusCode: auditLog.statusCode,
        ip: auditLog.ip,
        location: auditLog.location,
        userAgent: auditLog.userAgent,
        requestId: auditLog.requestId,
        durationMs: auditLog.durationMs,
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
        tenantId: loginLog.tenantId,
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
        tenantId: loginLog.tenantId,
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
    systemConfigs: runtimeSystemConfigs.length,
    systemConfigSecretVersions,
    systemNotices: seedSystemNotices.length,
    systemNoticeTemplates: seedSystemNoticeTemplates.length,
    systemDepts: seedSystemDepts.length,
    systemPosts: seedSystemPosts.length,
    fileAssets: seedFileAssets.length,
    auditLogs: seedAuditLogs.length,
    loginLogs: seedLoginLogs.length,
  };
}

function applyRuntimeIntegrationProviderEnv(
  provider: IntegrationProviderRecord,
): IntegrationProviderRecord {
  const runtime = OAUTH_RUNTIME_PROVIDERS.find(
    (item) => item.code === provider.code,
  );

  if (!runtime) {
    return provider;
  }

  const clientId = readOptionalEnv(
    `OPENCORE_${runtime.envPrefix}_OAUTH_CLIENT_ID`,
  );
  const callbackPath = readOptionalEnv(
    `OPENCORE_${runtime.envPrefix}_OAUTH_CALLBACK_URL`,
  );
  const clientSecret = readOptionalEnv(
    `OPENCORE_${runtime.envPrefix}_OAUTH_CLIENT_SECRET`,
  );

  if (!clientId && !callbackPath && !clientSecret) {
    return provider;
  }

  const enabled = provider.enabled || Boolean(clientId && clientSecret);

  return {
    ...provider,
    config: {
      ...provider.config,
      callbackPath:
        callbackPath ??
        (typeof provider.config.callbackPath === 'string'
          ? provider.config.callbackPath
          : `/api/auth/social/callback/${provider.code.replace(/^oauth\./, '')}`),
      clientId:
        clientId ??
        (typeof provider.config.clientId === 'string'
          ? provider.config.clientId
          : `opencore-${provider.code.replace(/^oauth\./, '')}`),
      clientSecret: '[REDACTED]',
    },
    configVersion: Math.max(provider.configVersion, 2),
    enabled,
    healthStatus:
      enabled && provider.healthStatus === 'disabled'
        ? 'unknown'
        : provider.healthStatus,
    secretRef: `secret://config/${runtime.configKey}`,
    secretRefStatus: clientSecret ? 'valid' : 'unchecked',
  };
}

function getRuntimeSystemConfigs(): typeof seedSystemConfigs {
  const existingKeys = new Set(seedSystemConfigs.map((config) => config.key));
  const runtimeConfigs = OAUTH_RUNTIME_PROVIDERS.filter(
    (provider) =>
      readOptionalEnv(`OPENCORE_${provider.envPrefix}_OAUTH_CLIENT_SECRET`) &&
      !existingKeys.has(provider.configKey),
  ).map((provider) => ({
    id: provider.configId,
    tenantId: 'tenant_root',
    category: 'integration' as const,
    name: provider.name,
    key: provider.configKey,
    value: `env:OPENCORE_${provider.envPrefix}_OAUTH_CLIENT_SECRET`,
    valueType: 'string' as const,
    description: `Secret env reference used by the ${provider.name}.`,
    encrypted: false,
    remark: provider.remark,
    public: false,
    system: true,
    visibility: 'secret' as const,
  }));

  return [...seedSystemConfigs, ...runtimeConfigs] as typeof seedSystemConfigs;
}

function readOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();

  return value ? value : undefined;
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
