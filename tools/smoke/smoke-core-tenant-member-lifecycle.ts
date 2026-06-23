#!/usr/bin/env node
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, login, request } = smoke;

const runId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const tenantCode = `smoke.member.${runId}`;
const tenantSlug = `smoke-member-${runId}`;
const ownerUsername = `smoke_member_owner_${runId}`;
const invitedUsername = `smoke_member_invited_${runId}`;
const overflowUsername = `smoke_member_overflow_${runId}`;
const roleCode = `member_role_${runId}`;
const postCode = `member_post_${runId}`;
const deptId = `member_dept_${runId}`;
let tenantId: string | undefined;
let prisma: PrismaClient | undefined;

async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);

    const tenant = await clients.tenancy.createTenant(token, {
      accountLimit: 2,
      code: tenantCode,
      name: 'Smoke Member Tenant',
      planCode: 'system.full',
      slug: tenantSlug,
      tenantId: 'tenant_malicious_ignored',
    } as never);
    tenantId = tenant.id;
    await seedTenantCatalog(tenantId);

    const owner = await clients.tenancy.createTenantMember(token, tenantId, {
      deptId,
      displayName: 'Smoke Member Owner',
      isOwner: true,
      password: 'SmokeMemberOwner1!',
      postCodes: [postCode],
      roleCodes: [roleCode],
      status: 'active',
      tenantId: 'tenant_malicious_ignored',
      username: ownerUsername,
    } as never);
    assertEqual(owner.username, ownerUsername, 'owner username');
    assertEqual(owner.status, 'active', 'owner status');
    assertEqual(owner.isOwner, true, 'owner flag');
    assertIncludes(owner.roleCodes, roleCode, 'owner role');
    assertIncludes(owner.postCodes, postCode, 'owner post');
    assertEqual(owner.deptId, deptId, 'owner dept');

    const invited = await clients.tenancy.createTenantMember(token, tenantId, {
      displayName: 'Smoke Member Invited',
      password: 'SmokeMemberInvited1!',
      status: 'invited',
      username: invitedUsername,
    });
    assertEqual(invited.status, 'invited', 'invited status');

    const members = await clients.tenancy.listTenantMembers(token, tenantId);
    assertArray(members, 'tenant control members');
    if (!members.some((member) => member.id === owner.id)) {
      throw new Error('Expected owner in tenant member list');
    }

    const overflow = await request<unknown>(
      `${apiPrefix}/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members`,
      {
        body: {
          displayName: 'Smoke Member Overflow',
          password: 'SmokeMemberOverflow1!',
          status: 'invited',
          username: overflowUsername,
        },
        expected: [400],
        method: 'POST',
        token,
      },
    );
    assertEqual(
      getApiErrorCode(overflow),
      'TENANT_MEMBER_ACCOUNT_LIMIT_REACHED',
      'account limit error code',
    );

    const updated = await clients.tenancy.updateTenantMember(
      token,
      tenantId,
      invited.id,
      {
        deptId,
        postCodes: [postCode],
        roleCodes: [roleCode],
        status: 'suspended',
      },
    );
    assertEqual(updated.status, 'suspended', 'updated member status');
    assertEqual(updated.deptId, deptId, 'updated member dept');

    const removed = await clients.tenancy.removeTenantMember(
      token,
      tenantId,
      invited.id,
    );
    assertEqual(removed.deleted, true, 'removed member deleted flag');
    const afterRemove = await clients.tenancy.listTenantMembers(token, tenantId);
    const leftMember = afterRemove.find((member) => member.id === invited.id);
    assertEqual(leftMember?.status, 'left', 'removed member left status');

    const lastOwner = await request<unknown>(
      `${apiPrefix}/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(owner.id)}`,
      {
        expected: [400],
        method: 'DELETE',
        token,
      },
    );
    assertEqual(
      getApiErrorCode(lastOwner),
      'TENANT_MEMBER_LAST_OWNER',
      'last owner guard error code',
    );

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
          'auth.login',
          'core.tenant-member-control.tenant-create',
          'core.tenant-member-control.catalog-fixture',
          'core.tenant-member-control.create-owner',
          'core.tenant-member-control.body-tenant-ignored',
          'core.tenant-member-control.invite',
          'core.tenant-member-control.list',
          'core.tenant-member-control.account-limit',
          'core.tenant-member-control.update',
          'core.tenant-member-control.remove-left',
          'core.tenant-member-control.last-owner-guard',
          'core.tenant-member-control.cleanup',
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
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
  }
}

void main();

async function seedTenantCatalog(id: string): Promise<void> {
  const client = await getSmokePrisma();
  await client.role.create({
    data: {
      code: roleCode,
      name: 'Smoke Member Role',
      tenantId: id,
    },
  });
  await client.systemPost.create({
    data: {
      code: postCode,
      name: 'Smoke Member Post',
      tenantId: id,
    },
  });
  await client.systemDept.create({
    data: {
      code: 'member',
      id: deptId,
      name: 'Smoke Member Dept',
      tenantId: id,
    },
  });
}

async function cleanup(): Promise<void> {
  const client = await getSmokePrisma();
  await client.tenant.deleteMany({
    where: { code: tenantCode },
  });
  await client.user.deleteMany({
    where: {
      username: {
        in: [ownerUsername, invitedUsername, overflowUsername],
      },
    },
  });
  tenantId = undefined;
}

async function getSmokePrisma(): Promise<PrismaClient> {
  if (!prisma) {
    const connectionString = assertString(
      process.env.DATABASE_URL,
      'DATABASE_URL',
    );
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  return prisma;
}

function getApiErrorCode(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if ('code' in value && typeof value.code === 'string') {
    return value.code;
  }

  if (
    'error' in value &&
    value.error &&
    typeof value.error === 'object' &&
    'code' in value.error &&
    typeof value.error.code === 'string'
  ) {
    return value.error.code;
  }

  return undefined;
}
