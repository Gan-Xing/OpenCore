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
import { listModules } from '@opencore/module-registry';
import type { Prisma } from '@prisma/client';
import type {
  CreateTenantPlanDto,
  CreateTenantDto,
  SetTenantStatusDto,
  TenantFoundationSummaryDto,
  TenantMemberDto,
  TenantPlanDeleteResultDto,
  TenantPlanDto,
  TenantDto,
  UpdateTenantPlanDto,
  UpdateTenantDto,
  UpdateTenantMemberAssignmentsDto,
} from './tenant.dto';

const ROOT_TENANT_CODE = 'root';
const ROOT_TENANT_ID = 'tenant_root';
const PLAN_CODE_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const TENANT_CODE_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const registeredModuleCodes: ReadonlySet<string> = new Set(
  listModules().map((moduleDefinition) => moduleDefinition.code),
);

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
        remark: plan.remark,
        moduleCodes: plan.modules
          .map((module) => module.moduleCode)
          .sort((left, right) => left.localeCompare(right)),
        tenantCount: tenants.filter((tenant) => tenant.planId === plan.id)
          .length,
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

  async listTenants(): Promise<TenantDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      include: tenantIncludes,
      orderBy: { code: 'asc' },
    });

    return tenants.map(toTenantDto);
  }

  async getTenant(tenantId: string): Promise<TenantDto> {
    return this.findTenantDto(normalizeTenantRecordId(tenantId));
  }

  async createTenant(body: CreateTenantDto): Promise<TenantDto> {
    const code = normalizeTenantCode(body.code);
    const slug = normalizeTenantSlug(body.slug);
    const name = normalizeTenantRequiredText(body.name, 'name');
    const status = normalizeTenantStatus(body.status ?? 'active');
    const planId = await this.resolveTenantPlanId(body.planCode ?? null);
    const accountLimit = normalizeTenantAccountLimit(body.accountLimit);
    const expiresAt = normalizeTenantExpiresAt(body.expiresAt);
    const requestContext = getRequestContext();

    await this.assertTenantCodeAvailable(code);
    await this.assertTenantSlugAvailable(slug);

    const tenant = await this.prisma.tenant.create({
      data: {
        accountLimit,
        code,
        contactMobile: normalizeTenantNullableText(body.contactMobile),
        contactName: normalizeTenantNullableText(body.contactName),
        createdByUserId: requestContext?.actorUserId,
        expiresAt: status === 'expired' && !expiresAt ? new Date() : expiresAt,
        name,
        planId,
        slug,
        status,
      },
      select: { id: true },
    });

    return this.findTenantDto(tenant.id);
  }

  async updateTenant(
    tenantId: string,
    body: UpdateTenantDto,
  ): Promise<TenantDto> {
    const id = normalizeTenantRecordId(tenantId);
    const existing = await this.prisma.tenant.findUnique({
      where: { id },
      select: { code: true, id: true, slug: true },
    });

    if (!existing) {
      throw tenantNotFound(id);
    }

    const codeProvided = hasOwn(body, 'code');
    const slugProvided = hasOwn(body, 'slug');
    const nameProvided = hasOwn(body, 'name');
    const planProvided = hasOwn(body, 'planCode');
    const contactNameProvided = hasOwn(body, 'contactName');
    const contactMobileProvided = hasOwn(body, 'contactMobile');
    const accountLimitProvided = hasOwn(body, 'accountLimit');
    const expiresAtProvided = hasOwn(body, 'expiresAt');

    const code = codeProvided ? normalizeTenantCode(body.code) : undefined;
    const slug = slugProvided ? normalizeTenantSlug(body.slug) : undefined;
    if (
      existing.id === ROOT_TENANT_ID &&
      ((code && code !== existing.code) || (slug && slug !== existing.slug))
    ) {
      throw tenantBadRequest(
        'TENANT_ROOT_IMMUTABLE',
        'Root tenant code and slug cannot be changed.',
        { tenantId: id },
      );
    }

    if (code && code !== existing.code) {
      await this.assertTenantCodeAvailable(code);
    }
    if (slug && slug !== existing.slug) {
      await this.assertTenantSlugAvailable(slug);
    }

    const planId = planProvided
      ? await this.resolveTenantPlanId(body.planCode ?? null)
      : undefined;

    await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(accountLimitProvided
          ? { accountLimit: normalizeTenantAccountLimit(body.accountLimit) }
          : {}),
        ...(code === undefined ? {} : { code }),
        ...(contactMobileProvided
          ? { contactMobile: normalizeTenantNullableText(body.contactMobile) }
          : {}),
        ...(contactNameProvided
          ? { contactName: normalizeTenantNullableText(body.contactName) }
          : {}),
        ...(expiresAtProvided
          ? { expiresAt: normalizeTenantExpiresAt(body.expiresAt) }
          : {}),
        ...(nameProvided
          ? { name: normalizeTenantRequiredText(body.name, 'name') }
          : {}),
        ...(planProvided ? { planId } : {}),
        ...(slug === undefined ? {} : { slug }),
      },
    });

    return this.findTenantDto(id);
  }

  async setTenantStatus(
    tenantId: string,
    body: SetTenantStatusDto,
  ): Promise<TenantDto> {
    const id = normalizeTenantRecordId(tenantId);
    const existing = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw tenantNotFound(id);
    }

    const status = normalizeTenantStatus(body.status);
    if (id === ROOT_TENANT_ID && status !== 'active') {
      throw tenantBadRequest(
        'TENANT_ROOT_STATUS_IMMUTABLE',
        'Root tenant cannot be suspended or expired.',
        { tenantId: id, status },
      );
    }

    const expiresAtProvided = hasOwn(body, 'expiresAt');
    const expiresAt = expiresAtProvided
      ? normalizeTenantExpiresAt(body.expiresAt)
      : status === 'expired'
        ? new Date()
        : status === 'active'
          ? null
          : undefined;

    await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(expiresAt === undefined ? {} : { expiresAt }),
        status,
      },
    });

    return this.findTenantDto(id);
  }

  async listTenantPlans(): Promise<TenantPlanDto[]> {
    const plans = await this.prisma.tenantPlan.findMany({
      include: tenantPlanIncludes,
      orderBy: { code: 'asc' },
    });

    return plans.map(toTenantPlanDto);
  }

  async getTenantPlan(planId: string): Promise<TenantPlanDto> {
    return this.findTenantPlanDto(normalizeId(planId, 'planId'));
  }

  async createTenantPlan(body: CreateTenantPlanDto): Promise<TenantPlanDto> {
    const code = normalizePlanCode(body.code);
    const name = normalizeRequiredText(body.name, 'name');
    const enabled = normalizeBoolean(body.enabled, true, 'enabled');
    const remark = normalizeNullableText(body.remark);
    const limits = normalizeLimits(body.limits);
    const moduleCodes = normalizeModuleCodes(body.moduleCodes ?? []);

    await this.assertTenantPlanCodeAvailable(code);

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tenantPlan.create({
        data: {
          code,
          enabled,
          limits,
          name,
          remark,
        },
        select: { id: true },
      });

      await writePlanModules(tx, created.id, moduleCodes);

      return created;
    });

    return this.findTenantPlanDto(plan.id);
  }

  async updateTenantPlan(
    planId: string,
    body: UpdateTenantPlanDto,
  ): Promise<TenantPlanDto> {
    const id = normalizeId(planId, 'planId');
    const existing = await this.prisma.tenantPlan.findUnique({
      where: { id },
      select: { code: true, id: true },
    });

    if (!existing) {
      throw tenantPlanNotFound(id);
    }

    const codeProvided = Object.prototype.hasOwnProperty.call(body, 'code');
    const nameProvided = Object.prototype.hasOwnProperty.call(body, 'name');
    const enabledProvided = Object.prototype.hasOwnProperty.call(
      body,
      'enabled',
    );
    const remarkProvided = Object.prototype.hasOwnProperty.call(body, 'remark');
    const limitsProvided = Object.prototype.hasOwnProperty.call(body, 'limits');
    const modulesProvided = Object.prototype.hasOwnProperty.call(
      body,
      'moduleCodes',
    );

    const code = codeProvided ? normalizePlanCode(body.code) : undefined;
    if (code && code !== existing.code) {
      await this.assertTenantPlanCodeAvailable(code);
    }

    const name = nameProvided
      ? normalizeRequiredText(body.name, 'name')
      : undefined;
    const enabled = enabledProvided
      ? normalizeBoolean(body.enabled, true, 'enabled')
      : undefined;
    const remark = remarkProvided
      ? normalizeNullableText(body.remark)
      : undefined;
    const limits = limitsProvided ? normalizeLimits(body.limits) : undefined;
    const moduleCodes = modulesProvided
      ? normalizeModuleCodes(body.moduleCodes ?? [])
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.tenantPlan.update({
        where: { id },
        data: {
          ...(code === undefined ? {} : { code }),
          ...(enabled === undefined ? {} : { enabled }),
          ...(limits === undefined ? {} : { limits }),
          ...(name === undefined ? {} : { name }),
          ...(remarkProvided ? { remark } : {}),
        },
      });

      if (moduleCodes) {
        await writePlanModules(tx, id, moduleCodes);
      }
    });

    return this.findTenantPlanDto(id);
  }

  async deleteTenantPlan(planId: string): Promise<TenantPlanDeleteResultDto> {
    const id = normalizeId(planId, 'planId');
    const plan = await this.prisma.tenantPlan.findUnique({
      where: { id },
      include: { tenants: { select: { id: true } } },
    });

    if (!plan) {
      throw tenantPlanNotFound(id);
    }

    if (plan.tenants.length > 0) {
      throw tenantPlanBadRequest(
        'TENANT_PLAN_IN_USE',
        'Tenant plan is assigned to tenants.',
        {
          planId: id,
          tenantCount: plan.tenants.length,
        },
      );
    }

    await this.prisma.tenantPlan.delete({ where: { id } });

    return {
      deleted: true,
      id,
      code: plan.code,
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

  private async findTenantPlanDto(planId: string): Promise<TenantPlanDto> {
    const plan = await this.prisma.tenantPlan.findUnique({
      where: { id: planId },
      include: tenantPlanIncludes,
    });

    if (!plan) {
      throw tenantPlanNotFound(planId);
    }

    return toTenantPlanDto(plan);
  }

  private async assertTenantPlanCodeAvailable(code: string): Promise<void> {
    const duplicate = await this.prisma.tenantPlan.findUnique({
      where: { code },
      select: { id: true },
    });

    if (duplicate) {
      throw tenantPlanBadRequest(
        'TENANT_PLAN_CODE_EXISTS',
        'Tenant plan code already exists.',
        {
          code,
        },
      );
    }
  }

  private async findTenantDto(tenantId: string): Promise<TenantDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: tenantIncludes,
    });

    if (!tenant) {
      throw tenantNotFound(tenantId);
    }

    return toTenantDto(tenant);
  }

  private async resolveTenantPlanId(
    planCode: string | null,
  ): Promise<string | null> {
    const normalizedPlanCode = normalizeTenantNullableText(planCode);
    if (!normalizedPlanCode) {
      return null;
    }

    const plan = await this.prisma.tenantPlan.findUnique({
      where: { code: normalizedPlanCode },
      select: { id: true },
    });

    if (!plan) {
      throw tenantPlanCodeNotFound(normalizedPlanCode);
    }

    return plan.id;
  }

  private async assertTenantCodeAvailable(code: string): Promise<void> {
    const duplicate = await this.prisma.tenant.findUnique({
      where: { code },
      select: { id: true },
    });

    if (duplicate) {
      throw tenantBadRequest(
        'TENANT_CODE_EXISTS',
        'Tenant code already exists.',
        { code },
      );
    }
  }

  private async assertTenantSlugAvailable(slug: string): Promise<void> {
    const duplicate = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (duplicate) {
      throw tenantBadRequest(
        'TENANT_SLUG_EXISTS',
        'Tenant slug already exists.',
        { slug },
      );
    }
  }
}

const tenantIncludes = {
  createdBy: { select: { username: true } },
  memberships: {
    include: {
      user: { select: { username: true } },
    },
  },
  plan: { select: { code: true, id: true } },
} satisfies Prisma.TenantInclude;

type TenantWithIncludes = Prisma.TenantGetPayload<{
  include: typeof tenantIncludes;
}>;

function toTenantDto(tenant: TenantWithIncludes): TenantDto {
  return {
    id: tenant.id,
    code: tenant.code,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    planCode: tenant.plan?.code ?? null,
    planId: tenant.plan?.id ?? null,
    accountLimit: tenant.accountLimit,
    membershipCount: tenant.memberships.length,
    activeMembershipCount: tenant.memberships.filter(
      (membership) => membership.status === 'active',
    ).length,
    ownerUsernames: tenant.memberships
      .filter((membership) => membership.isOwner)
      .map((membership) => membership.user.username)
      .sort((left, right) => left.localeCompare(right)),
    contactName: tenant.contactName,
    contactMobile: tenant.contactMobile,
    expiresAt: tenant.expiresAt?.toISOString() ?? null,
    createdByUsername: tenant.createdBy?.username ?? null,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

const tenantPlanIncludes = {
  modules: true,
  tenants: {
    select: { code: true, id: true, name: true, status: true },
    orderBy: { code: 'asc' },
  },
} satisfies Prisma.TenantPlanInclude;

type TenantPlanWithIncludes = Prisma.TenantPlanGetPayload<{
  include: typeof tenantPlanIncludes;
}>;

function toTenantPlanDto(plan: TenantPlanWithIncludes): TenantPlanDto {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    enabled: plan.enabled,
    limits: plan.limits,
    remark: plan.remark,
    moduleCodes: plan.modules
      .map((module) => module.moduleCode)
      .sort((left, right) => left.localeCompare(right)),
    tenantCount: plan.tenants.length,
    tenants: plan.tenants.map((tenant) => ({
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      status: tenant.status,
    })),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

async function writePlanModules(
  tx: PrismaTransactionClient,
  planId: string,
  moduleCodes: readonly string[],
): Promise<void> {
  await tx.tenantPlanModule.deleteMany({ where: { planId } });
  if (moduleCodes.length === 0) {
    return;
  }

  await tx.tenantPlanModule.createMany({
    data: moduleCodes.map((moduleCode) => ({ moduleCode, planId })),
  });
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

function normalizeId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_ID_INVALID',
      'Tenant plan id must be a non-empty string.',
      { field },
    );
  }

  return value.trim();
}

function normalizePlanCode(value: unknown): string {
  const code = normalizeRequiredText(value, 'code');

  if (!PLAN_CODE_PATTERN.test(code)) {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_CODE_INVALID',
      'Tenant plan code is invalid.',
      { code },
    );
  }

  return code;
}

function normalizeRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_FIELD_REQUIRED',
      'Tenant plan field is required.',
      { field },
    );
  }

  return value.trim();
}

function normalizeNullableText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_FIELD_INVALID',
      'Tenant plan field is invalid.',
      { field: 'remark' },
    );
  }

  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function normalizeBoolean(
  value: unknown,
  fallback: boolean,
  field: string,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_FIELD_INVALID',
      'Tenant plan field is invalid.',
      { field },
    );
  }

  return value;
}

function normalizeLimits(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) {
    return {};
  }

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value instanceof Date
  ) {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_LIMITS_INVALID',
      'Tenant plan limits must be a JSON object.',
    );
  }

  return value as Prisma.InputJsonValue;
}

function normalizeModuleCodes(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_MODULES_INVALID',
      'Tenant plan module codes must be an array.',
    );
  }

  const codes = value.map((moduleCode) => {
    if (typeof moduleCode !== 'string' || moduleCode.trim() === '') {
      throw tenantPlanBadRequest(
        'TENANT_PLAN_MODULES_INVALID',
        'Tenant plan module code must be a non-empty string.',
      );
    }

    return moduleCode.trim();
  });
  const seen = new Set<string>();
  const duplicate = codes.find((moduleCode) => {
    if (seen.has(moduleCode)) {
      return true;
    }

    seen.add(moduleCode);
    return false;
  });

  if (duplicate) {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_MODULE_DUPLICATE',
      'Tenant plan module codes must be unique.',
      { moduleCode: duplicate },
    );
  }

  const missing = codes.find(
    (moduleCode) => !registeredModuleCodes.has(moduleCode),
  );
  if (missing) {
    throw tenantPlanBadRequest(
      'TENANT_PLAN_MODULE_UNKNOWN',
      'Tenant plan module code is not registered.',
      { moduleCode: missing },
    );
  }

  return codes;
}

function normalizeTenantRecordId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw tenantBadRequest(
      'TENANT_ID_INVALID',
      'Tenant id must be a non-empty string.',
    );
  }

  return value.trim();
}

function normalizeTenantCode(value: unknown): string {
  const code = normalizeTenantRequiredText(value, 'code');

  if (!TENANT_CODE_PATTERN.test(code)) {
    throw tenantBadRequest('TENANT_CODE_INVALID', 'Tenant code is invalid.', {
      code,
    });
  }

  return code;
}

function normalizeTenantSlug(value: unknown): string {
  const slug = normalizeTenantRequiredText(value, 'slug');

  if (!TENANT_SLUG_PATTERN.test(slug)) {
    throw tenantBadRequest('TENANT_SLUG_INVALID', 'Tenant slug is invalid.', {
      slug,
    });
  }

  return slug;
}

function normalizeTenantRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw tenantBadRequest(
      'TENANT_FIELD_REQUIRED',
      'Tenant field is required.',
      { field },
    );
  }

  return value.trim();
}

function normalizeTenantNullableText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw tenantBadRequest('TENANT_FIELD_INVALID', 'Tenant field is invalid.');
  }

  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function normalizeTenantStatus(
  status: unknown,
): 'active' | 'expired' | 'suspended' {
  if (status === 'active' || status === 'expired' || status === 'suspended') {
    return status;
  }

  throw tenantBadRequest('TENANT_STATUS_INVALID', 'Tenant status is invalid.', {
    status,
  });
}

function normalizeTenantAccountLimit(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw tenantBadRequest(
      'TENANT_ACCOUNT_LIMIT_INVALID',
      'Tenant account limit must be a non-negative integer.',
      { accountLimit: value },
    );
  }

  return value;
}

function normalizeTenantExpiresAt(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw tenantBadRequest(
      'TENANT_EXPIRES_AT_INVALID',
      'Tenant expiresAt must be an ISO date string.',
    );
  }

  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) {
    throw tenantBadRequest(
      'TENANT_EXPIRES_AT_INVALID',
      'Tenant expiresAt must be an ISO date string.',
      { expiresAt: value },
    );
  }

  return expiresAt;
}

function hasOwn<T extends object>(value: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
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

function tenantPlanBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

function tenantPlanNotFound(planId: string): NotFoundException {
  return new NotFoundException(
    createApiErrorBody({
      code: 'TENANT_PLAN_NOT_FOUND',
      message: 'Tenant plan not found.',
      details: { planId },
    }),
  );
}

function tenantPlanCodeNotFound(planCode: string): NotFoundException {
  return new NotFoundException(
    createApiErrorBody({
      code: 'TENANT_PLAN_NOT_FOUND',
      message: 'Tenant plan not found.',
      details: { planCode },
    }),
  );
}

function tenantBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

function tenantNotFound(tenantId: string): NotFoundException {
  return new NotFoundException(
    createApiErrorBody({
      code: 'TENANT_NOT_FOUND',
      message: 'Tenant not found.',
      details: { tenantId },
    }),
  );
}
