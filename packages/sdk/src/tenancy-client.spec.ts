import type { SdkRequest } from './rbac-client';
import { createTenancyClient } from './tenancy-client';

describe('createTenancyClient', () => {
  it('uses stable paged tenancy control-plane API paths', async () => {
    const calls: Array<{ path: string; token?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ path, token: options?.token });
      return {} as never;
    };
    const client = createTenancyClient(request);

    await client.listTenantsPage('token', {
      keyword: 'root',
      orderBy: 'code',
      orderDirection: 'desc',
      page: 2,
      pageSize: 20,
      status: 'active',
    });
    await client.listTenantPlansPage('token', {
      enabled: true,
      moduleCode: 'core.tenant',
      page: 1,
      pageSize: 10,
    });
    await client.listMembersPage('token', {
      deptId: 'dept_root',
      isOwner: true,
      roleCode: 'admin',
      username: 'admin',
    });
    await client.listTenantMembersPage('token', 'tenant_root', {
      postCode: 'admin',
      status: 'active',
    });

    expect(calls).toEqual([
      {
        path: '/core/tenancy/tenants/page?keyword=root&orderBy=code&orderDirection=desc&page=2&pageSize=20&status=active',
        token: 'token',
      },
      {
        path: '/core/tenancy/plans/page?enabled=true&moduleCode=core.tenant&page=1&pageSize=10',
        token: 'token',
      },
      {
        path: '/core/tenancy/members/page?deptId=dept_root&isOwner=true&roleCode=admin&username=admin',
        token: 'token',
      },
      {
        path: '/core/tenancy/tenants/tenant_root/members/page?postCode=admin&status=active',
        token: 'token',
      },
    ]);
  });
});
