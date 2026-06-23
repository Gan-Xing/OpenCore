import { PrismaService } from '@opencore/database';
import { randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';
import { PrismaRbacRepository } from './prisma-rbac.repository';

describe('PrismaRbacRepository integration', () => {
  const prisma = new PrismaService();
  const repository = new PrismaRbacRepository(prisma);
  const authService = new AuthService(repository);
  const permissionCode = `core:perm-${randomUUID().slice(0, 8)}:read`;
  const tenantAuthzRunId = randomUUID().slice(0, 8);
  const tenantAuthzPlanId = `plan_authz_${tenantAuthzRunId}`;
  const tenantAuthzPlanCode = `authz-plan-${tenantAuthzRunId}`;
  const tenantAuthzId = `tenant_authz_${tenantAuthzRunId}`;
  const tenantAuthzCode = `authz-${tenantAuthzRunId}`;
  const tenantAuthzMembershipId = `membership_authz_${tenantAuthzRunId}`;

  beforeEach(async () => {
    await cleanupPermission();
    await cleanupTenantAuthz();
  });

  afterEach(async () => {
    await cleanupPermission();
    await cleanupTenantAuthz();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads seeded Permission.code values from PostgreSQL', async () => {
    await expect(repository.listPermissions()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'core:user:read' }),
        expect.objectContaining({ code: 'core:role:read' }),
        expect.objectContaining({ code: 'core:permission:read' }),
        expect.objectContaining({ code: 'core:menu:read' }),
      ]),
    );
    await expect(
      repository.getPermission('core:permission:read'),
    ).resolves.toEqual(
      expect.objectContaining({
        code: 'core:permission:read',
        system: true,
      }),
    );
  });

  it('persists custom permission detail and protects registry permissions', async () => {
    await expect(
      repository.createPermission({
        code: permissionCode,
        title: 'Read permission smoke',
      }),
    ).resolves.toMatchObject({
      code: permissionCode,
      system: false,
    });
    await expect(
      repository.getPermission(permissionCode),
    ).resolves.toMatchObject({
      code: permissionCode,
      title: 'Read permission smoke',
      system: false,
    });
    await expect(
      repository.updatePermission(permissionCode, {
        title: 'Read updated permission smoke',
      }),
    ).resolves.toMatchObject({
      code: permissionCode,
      title: 'Read updated permission smoke',
    });
    await expectHttpExceptionCode(
      repository.updatePermission('core:permission:read', {
        title: 'Renamed',
      }),
      'RBAC_SYSTEM_PERMISSION_IMMUTABLE',
    );
    await expectHttpExceptionCode(
      repository.deletePermission('core:permission:read'),
      'RBAC_SYSTEM_PERMISSION_IMMUTABLE',
    );
    await expect(repository.deletePermission(permissionCode)).resolves.toEqual({
      deleted: true,
    });
  });

  it('authenticates the seeded admin from PostgreSQL permissions', async () => {
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    expect(bootstrapPassword).toBeTruthy();

    const session = expectAuthenticated(
      await authService.login('admin', bootstrapPassword ?? ''),
    );

    expect(session.user.roleCodes).toContain('admin');
    expect(session.user.permissionCodes).toEqual(
      expect.arrayContaining([
        'core:user:read',
        'core:role:read',
        'core:permission:read',
        'core:menu:read',
      ]),
    );
    await expect(
      authService.authenticateBearer(`Bearer ${session.accessToken}`),
    ).resolves.toMatchObject({
      username: 'admin',
      roleCodes: expect.arrayContaining(['admin']),
    });
  });

  it('resolves seeded admin data-scope from PostgreSQL', async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { username: 'admin' },
      select: { id: true },
    });

    await expect(
      repository.getDataScopeProfileForUser(admin.id),
    ).resolves.toEqual({
      userId: admin.id,
      deptId: 'dept_headquarters',
      roles: [
        {
          roleCode: 'admin',
          dataScope: 'all',
          dataScopeDeptIds: [],
        },
      ],
    });
    await expect(
      repository.listDescendantDeptIds('dept_headquarters'),
    ).resolves.toEqual(['dept_engineering', 'dept_operations']);
  });

  it('uses active tenant membership roles and clips permissions by tenant plan modules', async () => {
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    expect(bootstrapPassword).toBeTruthy();

    const admin = await prisma.user.findUniqueOrThrow({
      where: { username: 'admin' },
      select: { id: true },
    });
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { code: 'admin' },
      select: { id: true },
    });
    const engineerPost = await prisma.systemPost.findUniqueOrThrow({
      where: { code: 'engineer' },
      select: { id: true },
    });

    await prisma.tenantPlan.create({
      data: {
        id: tenantAuthzPlanId,
        code: tenantAuthzPlanCode,
        name: 'Authz smoke plan',
        modules: {
          create: [{ moduleCode: 'core.dashboard' }],
        },
      },
    });
    await prisma.tenant.create({
      data: {
        id: tenantAuthzId,
        code: tenantAuthzCode,
        slug: tenantAuthzCode,
        name: 'Authz Smoke Tenant',
        planId: tenantAuthzPlanId,
        memberships: {
          create: {
            id: tenantAuthzMembershipId,
            userId: admin.id,
            deptId: 'dept_operations',
            status: 'active',
            roles: {
              create: {
                roleId: adminRole.id,
                tenantId: tenantAuthzId,
              },
            },
            posts: {
              create: {
                postId: engineerPost.id,
                tenantId: tenantAuthzId,
              },
            },
          },
        },
      },
    });

    const session = expectAuthenticated(
      await authService.login('admin', bootstrapPassword ?? '', {
        tenantCode: tenantAuthzCode,
      }),
    );

    expect(session.user.activeTenant?.code).toBe(tenantAuthzCode);
    expect(session.user.roleCodes).toEqual(['admin']);
    expect(session.user.postCodes).toEqual(['engineer']);
    expect(session.user.permissionCodes).toEqual(['core:dashboard:read']);
    await expect(
      repository.getDataScopeProfileForUser(admin.id, tenantAuthzMembershipId),
    ).resolves.toEqual({
      userId: admin.id,
      deptId: 'dept_operations',
      roles: [
        {
          roleCode: 'admin',
          dataScope: 'all',
          dataScopeDeptIds: [],
        },
      ],
    });
  });

  async function cleanupPermission(): Promise<void> {
    const permissions = await prisma.permission.findMany({
      where: { code: permissionCode },
      select: { id: true },
    });
    const permissionIds = permissions.map((permission) => permission.id);

    if (permissionIds.length > 0) {
      await prisma.menu.updateMany({
        where: { permissionId: { in: permissionIds } },
        data: { permissionId: null },
      });
      await prisma.rolePermission.deleteMany({
        where: { permissionId: { in: permissionIds } },
      });
    }

    await prisma.permission.deleteMany({ where: { code: permissionCode } });
  }

  async function cleanupTenantAuthz(): Promise<void> {
    await prisma.tenant.deleteMany({ where: { id: tenantAuthzId } });
    await prisma.tenantPlan.deleteMany({ where: { id: tenantAuthzPlanId } });
  }
});

function expectAuthenticated(
  session: Awaited<ReturnType<AuthService['login']>>,
) {
  if (session.status !== 'authenticated') {
    throw new Error('Expected authenticated login response');
  }

  return session;
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

  return undefined;
}
