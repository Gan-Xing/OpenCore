import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import { getRequestContext } from '@opencore/core';
import {
  PrismaService,
  type PrismaTransactionClient,
} from '@opencore/database';
import type { Prisma } from '@prisma/client';
import type {
  TenantFoundationSummaryDto,
  TenantMemberDto,
  UpdateTenantMemberAssignmentsDto,
} from './tenant.dto';

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

  async listMembers(): Promise<TenantMemberDto[]> {
    const tenantId = resolveCurrentTenantId();
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { tenantId },
      include: memberIncludes,
      orderBy: [{ isOwner: 'desc' }, { createdAt: 'asc' }],
    });

    return memberships.map(toTenantMemberDto);
  }

  async updateMemberAssignments(
    membershipId: string,
    body: UpdateTenantMemberAssignmentsDto,
  ): Promise<TenantMemberDto> {
    const tenantId = resolveCurrentTenantId();
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId },
      select: { id: true, userId: true },
    });

    if (!membership) {
      throw tenantMemberNotFound(
        'TENANT_MEMBER_NOT_FOUND',
        'Tenant member not found.',
        {
          membershipId,
          tenantId,
        },
      );
    }

    const deptProvided = Object.prototype.hasOwnProperty.call(body, 'deptId');
    const nextDeptId = deptProvided ? (body.deptId ?? null) : undefined;
    const status = normalizeStatus(body.status);
    const roleCodes =
      body.roleCodes === undefined
        ? undefined
        : normalizeCodes(body.roleCodes, 'roleCodes');
    const postCodes =
      body.postCodes === undefined
        ? undefined
        : normalizeCodes(body.postCodes, 'postCodes');

    if (nextDeptId) {
      const dept = await this.prisma.systemDept.findFirst({
        where: { id: nextDeptId, tenantId },
        select: { id: true },
      });

      if (!dept) {
        throw tenantMemberNotFound(
          'TENANT_MEMBER_DEPT_NOT_FOUND',
          'System dept not found.',
          {
            deptId: nextDeptId,
            tenantId,
          },
        );
      }
    }

    const roles =
      roleCodes === undefined
        ? undefined
        : await this.findRolesByCodes(tenantId, roleCodes);
    const posts =
      postCodes === undefined
        ? undefined
        : await this.findPostsByCodes(tenantId, postCodes);

    return this.prisma.$transaction(async (tx) => {
      await tx.tenantMembership.update({
        where: { id: membership.id },
        data: {
          ...(status === undefined ? {} : { status }),
          ...(deptProvided ? { deptId: nextDeptId } : {}),
        },
      });

      if (roles) {
        await tx.tenantMembershipRole.deleteMany({
          where: { membershipId: membership.id, tenantId },
        });
        if (roles.length > 0) {
          await tx.tenantMembershipRole.createMany({
            data: roles.map((role) => ({
              membershipId: membership.id,
              roleId: role.id,
              tenantId,
            })),
          });
        }
      }

      if (posts) {
        await tx.tenantMembershipPost.deleteMany({
          where: { membershipId: membership.id, tenantId },
        });
        if (posts.length > 0) {
          await tx.tenantMembershipPost.createMany({
            data: posts.map((post) => ({
              membershipId: membership.id,
              postId: post.id,
              tenantId,
            })),
          });
        }
      }

      if (tenantId === ROOT_TENANT_ID) {
        await syncRootLegacyUser(tx, membership.userId, {
          deptId: nextDeptId,
          deptProvided,
          postIds: posts?.map((post) => post.id),
          roleIds: roles?.map((role) => role.id),
          status,
        });
      }

      return findMemberDto(tx, tenantId, membership.id);
    });
  }

  private async findRolesByCodes(
    tenantId: string,
    roleCodes: readonly string[],
  ) {
    if (roleCodes.length === 0) {
      return [];
    }

    const roles = await this.prisma.role.findMany({
      where: { code: { in: [...roleCodes] }, tenantId },
      select: { code: true, id: true },
    });
    const foundCodes = new Set(roles.map((role) => role.code));
    const missing = roleCodes.find((code) => !foundCodes.has(code));

    if (missing) {
      throw tenantMemberNotFound(
        'TENANT_MEMBER_ROLE_NOT_FOUND',
        'Role not found.',
        {
          code: missing,
          tenantId,
        },
      );
    }

    return roles;
  }

  private async findPostsByCodes(
    tenantId: string,
    postCodes: readonly string[],
  ) {
    if (postCodes.length === 0) {
      return [];
    }

    const posts = await this.prisma.systemPost.findMany({
      where: { code: { in: [...postCodes] }, tenantId },
      select: { code: true, id: true },
    });
    const foundCodes = new Set(posts.map((post) => post.code));
    const missing = postCodes.find((code) => !foundCodes.has(code));

    if (missing) {
      throw tenantMemberNotFound(
        'TENANT_MEMBER_POST_NOT_FOUND',
        'System post not found.',
        {
          code: missing,
          tenantId,
        },
      );
    }

    return posts;
  }
}

const memberIncludes = {
  dept: { select: { id: true, name: true } },
  posts: { include: { post: { select: { code: true } } } },
  roles: { include: { role: { select: { code: true } } } },
  user: { select: { displayName: true, id: true, username: true } },
} satisfies Prisma.TenantMembershipInclude;

type TenantMemberWithIncludes = Prisma.TenantMembershipGetPayload<{
  include: typeof memberIncludes;
}>;

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

async function findMemberDto(
  db: PrismaTransactionClient,
  tenantId: string,
  membershipId: string,
): Promise<TenantMemberDto> {
  const member = await db.tenantMembership.findFirst({
    where: { id: membershipId, tenantId },
    include: memberIncludes,
  });

  if (!member) {
    throw tenantMemberNotFound(
      'TENANT_MEMBER_NOT_FOUND',
      'Tenant member not found.',
      {
        membershipId,
        tenantId,
      },
    );
  }

  return toTenantMemberDto(member);
}

function toTenantMemberDto(member: TenantMemberWithIncludes): TenantMemberDto {
  return {
    id: member.id,
    userId: member.userId,
    username: member.user.username,
    displayName: member.user.displayName,
    status: member.status,
    isOwner: member.isOwner,
    deptId: member.deptId,
    deptName: member.dept?.name ?? null,
    roleCodes: member.roles
      .map((membershipRole) => membershipRole.role.code)
      .sort((left, right) => left.localeCompare(right)),
    postCodes: member.posts
      .map((membershipPost) => membershipPost.post.code)
      .sort((left, right) => left.localeCompare(right)),
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function normalizeStatus(
  status: string | undefined,
): 'active' | 'suspended' | undefined {
  if (status === undefined) {
    return undefined;
  }

  if (status === 'active' || status === 'suspended') {
    return status;
  }

  throw tenantMemberBadRequest(
    'TENANT_MEMBER_STATUS_INVALID',
    'Invalid member status.',
    {
      status,
    },
  );
}

function normalizeCodes(
  value: readonly string[],
  field: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw tenantMemberBadRequest(
      'TENANT_MEMBER_ASSIGNMENT_INVALID',
      'Assignment codes must be an array.',
      {
        field,
      },
    );
  }

  const codes = value.map((code) => {
    if (typeof code !== 'string' || code.trim() === '') {
      throw tenantMemberBadRequest(
        'TENANT_MEMBER_ASSIGNMENT_INVALID',
        'Assignment code must be a non-empty string.',
        {
          field,
        },
      );
    }

    return code.trim();
  });
  const seen = new Set<string>();
  const duplicate = codes.find((code) => {
    if (seen.has(code)) {
      return true;
    }

    seen.add(code);
    return false;
  });

  if (duplicate) {
    throw tenantMemberBadRequest(
      'TENANT_MEMBER_ASSIGNMENT_DUPLICATE',
      'Assignment codes must be unique.',
      {
        code: duplicate,
        field,
      },
    );
  }

  return codes;
}

async function syncRootLegacyUser(
  tx: PrismaTransactionClient,
  userId: string,
  input: {
    deptId: string | null | undefined;
    deptProvided: boolean;
    postIds?: readonly string[];
    roleIds?: readonly string[];
    status?: 'active' | 'suspended';
  },
): Promise<void> {
  if (input.status !== undefined || input.deptProvided) {
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.status === undefined
          ? {}
          : { enabled: input.status === 'active' }),
        ...(input.deptProvided ? { deptId: input.deptId } : {}),
      },
    });
  }

  if (input.roleIds) {
    await tx.userRole.deleteMany({ where: { userId } });
    if (input.roleIds.length > 0) {
      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({ roleId, userId })),
      });
    }
  }

  if (input.postIds) {
    await tx.userPost.deleteMany({ where: { userId } });
    if (input.postIds.length > 0) {
      await tx.userPost.createMany({
        data: input.postIds.map((postId) => ({ postId, userId })),
      });
    }
  }
}

function tenantMemberBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

function tenantMemberNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}
