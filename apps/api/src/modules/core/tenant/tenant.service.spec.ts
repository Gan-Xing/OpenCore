import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import { TenantFoundationService } from './tenant.service';

const ROOT_TENANT_ID = 'tenant_root';

describe('TenantFoundationService membership assignments', () => {
  const prisma = new PrismaService();
  const service = new TenantFoundationService(prisma);
  const runId = randomUUID().slice(0, 8);
  const tenantId = `tenant_member_${runId}`;
  const otherTenantId = `tenant_member_other_${runId}`;
  const membershipId = `membership_member_${runId}`;
  const username = `tenant_member_${runId}`;
  const roleCode = `role_member_${runId}`;
  const otherRoleCode = `role_member_other_${runId}`;
  const postCode = `post_member_${runId}`;
  const deptId = `dept_member_${runId}`;
  const planCode = `plan.member.${runId}`;
  const updatedPlanCode = `plan.member.updated.${runId}`;
  const managedTenantCode = `tenant.lifecycle.${runId}`;
  const updatedManagedTenantCode = `tenant.lifecycle.updated.${runId}`;
  const managedTenantSlug = `tenant-lifecycle-${runId}`;
  const updatedManagedTenantSlug = `tenant-lifecycle-updated-${runId}`;

  beforeEach(async () => {
    await cleanup();
    await seedRows();
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('updates assignments for the active tenant membership', async () => {
    const result = await runInTenant(tenantId, () =>
      service.updateMemberAssignments(membershipId, {
        deptId,
        postCodes: [postCode],
        roleCodes: [roleCode],
        status: 'suspended',
      }),
    );

    expect(result).toMatchObject({
      deptId,
      postCodes: [postCode],
      roleCodes: [roleCode],
      status: 'suspended',
      username,
    });
  });

  it('rejects cross-tenant role assignments', async () => {
    await expectHttpExceptionCode(
      runInTenant(tenantId, () =>
        service.updateMemberAssignments(membershipId, {
          roleCodes: [otherRoleCode],
        }),
      ),
      'TENANT_MEMBER_ROLE_NOT_FOUND',
    );
  });

  it('manages tenant plans with module registry validation', async () => {
    const created = await service.createTenantPlan({
      code: planCode,
      limits: { accountLimit: 3 },
      moduleCodes: ['core.tenant'],
      name: 'Tenant Member Plan',
      remark: 'created by test',
    });

    expect(created).toMatchObject({
      code: planCode,
      enabled: true,
      moduleCodes: ['core.tenant'],
      name: 'Tenant Member Plan',
      tenantCount: 0,
    });

    const updated = await service.updateTenantPlan(created.id, {
      code: updatedPlanCode,
      enabled: false,
      limits: { accountLimit: 4 },
      moduleCodes: ['core.tenant', 'core.tenant-plan'],
      name: 'Tenant Member Plan Updated',
      remark: null,
    });

    expect(updated).toMatchObject({
      code: updatedPlanCode,
      enabled: false,
      moduleCodes: ['core.tenant', 'core.tenant-plan'],
      name: 'Tenant Member Plan Updated',
      remark: null,
    });

    const listed = await service.listTenantPlans();
    expect(listed.some((plan) => plan.id === updated.id)).toBe(true);

    await expectHttpExceptionCode(
      service.createTenantPlan({
        code: planCode,
        moduleCodes: ['core.missing'],
        name: 'Invalid Tenant Member Plan',
      }),
      'TENANT_PLAN_MODULE_UNKNOWN',
    );

    await expect(service.deleteTenantPlan(updated.id)).resolves.toMatchObject({
      code: updatedPlanCode,
      deleted: true,
      id: updated.id,
    });
    await expectHttpExceptionCode(
      service.getTenantPlan(updated.id),
      'TENANT_PLAN_NOT_FOUND',
    );
  });

  it('blocks deleting tenant plans that are assigned to tenants', async () => {
    const created = await service.createTenantPlan({
      code: planCode,
      moduleCodes: ['core.tenant'],
      name: 'Tenant Member Assigned Plan',
    });
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { planId: created.id },
    });

    await expectHttpExceptionCode(
      service.deleteTenantPlan(created.id),
      'TENANT_PLAN_IN_USE',
    );
  });

  it('manages tenant lifecycle without hard delete API', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const created = await runInTenant(ROOT_TENANT_ID, () =>
      service.createTenant({
        accountLimit: 12,
        code: managedTenantCode,
        contactName: 'Lifecycle Owner',
        expiresAt,
        name: 'Tenant Lifecycle Test',
        planCode: 'system.full',
        slug: managedTenantSlug,
      }),
    );

    expect(created).toMatchObject({
      accountLimit: 12,
      code: managedTenantCode,
      contactName: 'Lifecycle Owner',
      membershipCount: 0,
      name: 'Tenant Lifecycle Test',
      planCode: 'system.full',
      slug: managedTenantSlug,
      status: 'active',
    });

    const updated = await service.updateTenant(created.id, {
      accountLimit: 15,
      code: updatedManagedTenantCode,
      contactMobile: '15500001111',
      contactName: null,
      expiresAt: null,
      name: 'Tenant Lifecycle Updated',
      planCode: null,
      slug: updatedManagedTenantSlug,
    });

    expect(updated).toMatchObject({
      accountLimit: 15,
      code: updatedManagedTenantCode,
      contactMobile: '15500001111',
      contactName: null,
      expiresAt: null,
      name: 'Tenant Lifecycle Updated',
      planCode: null,
      slug: updatedManagedTenantSlug,
    });

    const suspended = await service.setTenantStatus(updated.id, {
      status: 'suspended',
    });
    expect(suspended.status).toBe('suspended');

    const reactivated = await service.setTenantStatus(updated.id, {
      status: 'active',
    });
    expect(reactivated.status).toBe('active');
    expect(reactivated.expiresAt).toBeNull();

    const tenants = await service.listTenants();
    expect(tenants.some((tenant) => tenant.id === updated.id)).toBe(true);
    await expect(service.getTenant(updated.id)).resolves.toMatchObject({
      id: updated.id,
      code: updatedManagedTenantCode,
    });

    await expectHttpExceptionCode(
      service.createTenant({
        code: `${managedTenantCode}.missing`,
        name: 'Missing Plan Tenant',
        planCode: 'missing.plan',
        slug: `${managedTenantSlug}-missing`,
      }),
      'TENANT_PLAN_NOT_FOUND',
    );

    await expectHttpExceptionCode(
      service.setTenantStatus(ROOT_TENANT_ID, { status: 'suspended' }),
      'TENANT_ROOT_STATUS_IMMUTABLE',
    );
  });

  async function seedRows(): Promise<void> {
    await prisma.tenant.createMany({
      data: [
        {
          id: tenantId,
          code: tenantId,
          slug: tenantId,
          name: 'Tenant Member Test',
        },
        {
          id: otherTenantId,
          code: otherTenantId,
          slug: otherTenantId,
          name: 'Other Tenant Member Test',
        },
      ],
    });
    const user = await prisma.user.create({
      data: {
        displayName: 'Tenant Member User',
        passwordHash: 'test',
        username,
      },
      select: { id: true },
    });
    await prisma.role.createMany({
      data: [
        {
          code: roleCode,
          name: 'Tenant Member Role',
          tenantId,
        },
        {
          code: otherRoleCode,
          name: 'Other Tenant Member Role',
          tenantId: otherTenantId,
        },
      ],
    });
    await prisma.systemPost.create({
      data: {
        code: postCode,
        name: 'Tenant Member Post',
        tenantId,
      },
    });
    await prisma.systemDept.create({
      data: {
        id: deptId,
        code: 'member',
        name: 'Tenant Member Dept',
        tenantId,
      },
    });
    await prisma.tenantMembership.create({
      data: {
        id: membershipId,
        tenantId,
        userId: user.id,
      },
    });
  }

  async function cleanup(): Promise<void> {
    await prisma.tenant.deleteMany({
      where: {
        OR: [
          { id: { in: [tenantId, otherTenantId] } },
          { code: { in: [managedTenantCode, updatedManagedTenantCode] } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { username } });
    await prisma.tenantPlan.deleteMany({
      where: { code: { in: [planCode, updatedPlanCode] } },
    });
  }
});

function runInTenant<T>(tenantId: string, callback: () => T): T {
  return runWithRequestContext(
    {
      requestId: `test-${tenantId}`,
      tenantId,
      traceId: `test-${tenantId}`,
    },
    callback,
  );
}

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  throw error;
}
