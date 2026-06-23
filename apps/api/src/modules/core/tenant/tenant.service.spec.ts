import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import { TenantFoundationService } from './tenant.service';

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
      where: { id: { in: [tenantId, otherTenantId] } },
    });
    await prisma.user.deleteMany({ where: { username } });
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
