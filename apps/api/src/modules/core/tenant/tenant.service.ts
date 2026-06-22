import { Injectable } from '@nestjs/common';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type { TenantFoundationSummaryDto } from './tenant.dto';

const ROOT_TENANT_CODE = 'root';
const ROOT_TENANT_ID = 'tenant_root';

@Injectable()
export class TenantFoundationService {
  constructor(private readonly prisma: PrismaService) {}

  async getFoundationSummary(): Promise<TenantFoundationSummaryDto> {
    const [plans, tenants, platformRoles, backfill] = await Promise.all([
      this.prisma.tenantPlan.findMany({
        include: { modules: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.tenant.findMany({
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
          plan: true,
        },
        orderBy: { code: 'asc' },
      }),
      this.prisma.platformRole.findMany({
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          users: true,
        },
        orderBy: { code: 'asc' },
      }),
      this.getBackfillSummary(),
    ]);
    const requestContext = getRequestContext();

    return {
      tenancyMode:
        process.env.OPENCORE_TENANCY_MODE === 'shared' ? 'shared' : 'single',
      rootTenantCode: ROOT_TENANT_CODE,
      plans: plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        enabled: plan.enabled,
        limits: plan.limits,
        moduleCodes: plan.modules
          .map((module) => module.moduleCode)
          .sort((left, right) => left.localeCompare(right)),
      })),
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        code: tenant.code,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        planCode: tenant.plan?.code ?? null,
        accountLimit: tenant.accountLimit,
        membershipCount: tenant.memberships.length,
        activeMembershipCount: tenant.memberships.filter(
          (membership) => membership.status === 'active',
        ).length,
        ownerUsernames: tenant.memberships
          .filter((membership) => membership.isOwner)
          .map((membership) => membership.user.username)
          .sort((left, right) => left.localeCompare(right)),
      })),
      platformRoles: platformRoles.map((role) => ({
        code: role.code,
        name: role.name,
        enabled: role.enabled,
        userCount: role.users.length,
        permissionCodes: role.permissions
          .map((rolePermission) => rolePermission.permission.code)
          .sort((left, right) => left.localeCompare(right)),
      })),
      backfill,
      requestContext: requestContext
        ? {
            accessMode: requestContext.accessMode,
            actorUserId: requestContext.actorUserId,
            membershipId: requestContext.membershipId,
            tenantId: requestContext.tenantId,
          }
        : undefined,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getBackfillSummary() {
    const [
      users,
      rootMemberships,
      userRoleCount,
      rootMembershipRoleCount,
      userPostCount,
      rootMembershipPostCount,
    ] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
        },
        orderBy: { username: 'asc' },
      }),
      this.prisma.tenantMembership.findMany({
        where: { tenantId: ROOT_TENANT_ID },
        select: { userId: true },
      }),
      this.prisma.userRole.count(),
      this.prisma.tenantMembershipRole.count({
        where: { tenantId: ROOT_TENANT_ID },
      }),
      this.prisma.userPost.count(),
      this.prisma.tenantMembershipPost.count({
        where: { tenantId: ROOT_TENANT_ID },
      }),
    ]);
    const rootMembershipUserIds = new Set(
      rootMemberships.map((membership) => membership.userId),
    );

    return {
      userCount: users.length,
      rootMembershipCount: rootMemberships.length,
      userRoleCount,
      rootMembershipRoleCount,
      userPostCount,
      rootMembershipPostCount,
      missingRootMembershipUsernames: users
        .filter((user) => !rootMembershipUserIds.has(user.id))
        .map((user) => user.username),
    };
  }
}
