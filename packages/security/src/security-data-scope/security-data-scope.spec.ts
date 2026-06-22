import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import 'reflect-metadata';
import {
  SecurityAuthUserRepository,
  type SecurityAuthUserRecord,
} from '../security-auth/security-auth.repository';
import { SecurityAuthService } from '../security-auth/security-auth.service';
import { hashSecurityPassword } from '../security-auth/security-password';
import {
  REQUIRED_DATA_SCOPE_KEY,
  RequireDataScope,
} from './security-data-scope.decorators';
import { SecurityDataScopeGuard } from './security-data-scope.guard';
import {
  createSecurityDataScopeQueryFilter,
  mergeSecurityDataScopeQueryFilter,
  resolveSecurityDataScopeConstraint,
} from './security-data-scope.policy';
import {
  SecurityDataScopeRepository,
  type SecurityDataScopeProfile,
} from './security-data-scope.repository';
import { SecurityDataScopeService } from './security-data-scope.service';

describe('@opencore/security security-data-scope', () => {
  it('sets data-scope metadata through decorators', () => {
    class Target {}

    RequireDataScope({ userIdField: 'ownerId', deptIdField: 'deptId' })(Target);

    expect(readMetadata(REQUIRED_DATA_SCOPE_KEY, Target)).toEqual({
      userIdField: 'ownerId',
      deptIdField: 'deptId',
    });
  });

  it('resolves all scope when any role grants all data', async () => {
    const repository = new InMemoryDataScopeRepository('admin');

    await expect(
      resolveSecurityDataScopeConstraint(
        await repository.getDataScopeProfileForUser('user_admin'),
        repository,
      ),
    ).resolves.toEqual({
      type: 'all',
      reasons: ['admin'],
    });
  });

  it('resolves dept tree and self scopes into query filters', async () => {
    const repository = new InMemoryDataScopeRepository('operator');
    const constraint = await resolveSecurityDataScopeConstraint(
      await repository.getDataScopeProfileForUser('user_operator'),
      repository,
    );

    expect(constraint).toEqual({
      type: 'restricted',
      userIds: ['user_operator'],
      deptIds: ['dept_engineering', 'dept_platform'],
      reasons: ['auditor:self', 'operator:dept_tree'],
    });
    expect(
      createSecurityDataScopeQueryFilter(constraint, {
        userIdField: 'createdById',
        deptIdField: 'deptId',
      }),
    ).toEqual({
      OR: [
        {
          createdById: {
            in: ['user_operator'],
          },
        },
        {
          deptId: {
            in: ['dept_engineering', 'dept_platform'],
          },
        },
      ],
    });
  });

  it('returns deny filters when no effective field can be applied', async () => {
    expect(
      createSecurityDataScopeQueryFilter(
        {
          type: 'restricted',
          userIds: ['user_operator'],
          deptIds: [],
          reasons: ['auditor:self'],
        },
        { deptIdField: 'deptId' },
      ),
    ).toEqual({
      id: {
        in: [],
      },
    });
    expect(
      mergeSecurityDataScopeQueryFilter(
        { status: 'draft' },
        { deptId: { in: ['dept_engineering'] } },
      ),
    ).toEqual({
      AND: [{ status: 'draft' }, { deptId: { in: ['dept_engineering'] } }],
    });
  });

  it('attaches data-scope context to requests with metadata', async () => {
    const authRepository = new InMemoryAuthRepository();
    const dataScopeRepository = new InMemoryDataScopeRepository('operator');
    const authService = new SecurityAuthService(authRepository);
    const guard = new SecurityDataScopeGuard(
      createReflector({
        userIdField: 'createdById',
        deptIdField: 'deptId',
      }),
      new SecurityDataScopeService(dataScopeRepository, authService),
    );
    const token = expectAuthenticated(
      await authService.login('operator', 'operator123'),
    ).accessToken;
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user.username', 'operator');
    expect(request).toHaveProperty('dataScope.constraint.type', 'restricted');
  });

  it('is inert without metadata and rejects missing bearer tokens with metadata', async () => {
    const authService = new SecurityAuthService(new InMemoryAuthRepository());
    const dataScopeService = new SecurityDataScopeService(
      new InMemoryDataScopeRepository('operator'),
      authService,
    );

    await expect(
      new SecurityDataScopeGuard(
        createReflector(undefined),
        dataScopeService,
      ).canActivate(createContext({ headers: {} })),
    ).resolves.toBe(true);
    await expect(
      new SecurityDataScopeGuard(
        createReflector({ deptIdField: 'deptId' }),
        dataScopeService,
      ).canActivate(createContext({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });
});

class InMemoryAuthRepository extends SecurityAuthUserRepository {
  private readonly users: SecurityAuthUserRecord[] = [
    {
      id: 'user_operator',
      username: 'operator',
      displayName: 'Operator',
      passwordHash: hashSecurityPassword('operator123'),
      roleCodes: ['operator', 'auditor'],
      enabled: true,
    },
  ];

  async findUserByUsername(
    username: string,
  ): Promise<SecurityAuthUserRecord | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async findUserById(id: string): Promise<SecurityAuthUserRecord | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getPermissionCodesForUser(): Promise<string[]> {
    return ['core:dashboard:read'];
  }
}

class InMemoryDataScopeRepository extends SecurityDataScopeRepository {
  constructor(private readonly profile: 'admin' | 'operator') {
    super();
  }

  async getDataScopeProfileForUser(
    userId: string,
  ): Promise<SecurityDataScopeProfile | undefined> {
    if (this.profile === 'admin') {
      return {
        userId,
        deptId: 'dept_headquarters',
        roles: [
          {
            roleCode: 'admin',
            dataScope: 'all',
            dataScopeDeptIds: [],
          },
        ],
      };
    }

    return {
      userId,
      deptId: 'dept_engineering',
      roles: [
        {
          roleCode: 'operator',
          dataScope: 'dept_tree',
          dataScopeDeptIds: [],
        },
        {
          roleCode: 'auditor',
          dataScope: 'self',
          dataScopeDeptIds: [],
        },
      ],
    };
  }

  async listDescendantDeptIds(deptId: string): Promise<string[]> {
    return deptId === 'dept_engineering' ? ['dept_platform'] : [];
  }
}

function createReflector(
  options:
    | {
        userIdField?: string;
        deptIdField?: string;
      }
    | undefined,
): Reflector {
  return {
    getAllAndOverride: (metadataKey: string) =>
      metadataKey === REQUIRED_DATA_SCOPE_KEY ? options : undefined,
  } as unknown as Reflector;
}

function createContext(request: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function readMetadata(key: string, target: object): unknown {
  return (
    Reflect as unknown as {
      getMetadata(metadataKey: string, metadataTarget: object): unknown;
    }
  ).getMetadata(key, target);
}

function expectAuthenticated(
  session: Awaited<ReturnType<SecurityAuthService['login']>>,
) {
  if (session.status !== 'authenticated') {
    throw new Error('Expected authenticated login response');
  }

  return session;
}
