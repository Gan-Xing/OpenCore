import type {
  SecurityDataScopeProfile,
  SecurityDataScopeRepository,
  SecurityDataScopeType,
} from './security-data-scope.repository';

export type SecurityDataScopeConstraint =
  | {
      type: 'all';
      reasons: readonly string[];
    }
  | {
      type: 'restricted';
      userIds: readonly string[];
      deptIds: readonly string[];
      reasons: readonly string[];
    }
  | {
      type: 'none';
      reasons: readonly string[];
    };

export type SecurityDataScopeQueryFields = {
  userIdField?: string;
  deptIdField?: string;
};

export type SecurityDataScopeQueryFilter = Record<string, unknown>;

export async function resolveSecurityDataScopeConstraint(
  profile: SecurityDataScopeProfile | undefined,
  repository: Pick<SecurityDataScopeRepository, 'listDescendantDeptIds'>,
): Promise<SecurityDataScopeConstraint> {
  if (!profile) {
    return {
      type: 'none',
      reasons: ['missing-profile'],
    };
  }

  const roleScopes = profile.roles;

  if (roleScopes.some((role) => role.dataScope === 'all')) {
    return {
      type: 'all',
      reasons: roleScopes
        .filter((role) => role.dataScope === 'all')
        .map((role) => role.roleCode)
        .sort(),
    };
  }

  const userIds = new Set<string>();
  const deptIds = new Set<string>();
  const reasons = new Set<string>();

  for (const role of roleScopes) {
    await collectRoleScope(role.dataScope, {
      roleCode: role.roleCode,
      profile,
      roleDeptIds: role.dataScopeDeptIds,
      repository,
      userIds,
      deptIds,
      reasons,
    });
  }

  if (userIds.size === 0 && deptIds.size === 0) {
    return {
      type: 'none',
      reasons: ['no-effective-data-scope'],
    };
  }

  return {
    type: 'restricted',
    userIds: [...userIds].sort(),
    deptIds: [...deptIds].sort(),
    reasons: [...reasons].sort(),
  };
}

export function createSecurityDataScopeQueryFilter(
  constraint: SecurityDataScopeConstraint,
  fields: SecurityDataScopeQueryFields,
): SecurityDataScopeQueryFilter {
  if (constraint.type === 'all') {
    return {};
  }

  if (constraint.type === 'none') {
    return {
      id: {
        in: [],
      },
    };
  }

  const filters: SecurityDataScopeQueryFilter[] = [];

  if (fields.userIdField && constraint.userIds.length > 0) {
    filters.push({
      [fields.userIdField]: {
        in: [...constraint.userIds],
      },
    });
  }

  if (fields.deptIdField && constraint.deptIds.length > 0) {
    filters.push({
      [fields.deptIdField]: {
        in: [...constraint.deptIds],
      },
    });
  }

  if (filters.length === 0) {
    return {
      id: {
        in: [],
      },
    };
  }

  return filters.length === 1
    ? filters[0]
    : {
        OR: filters,
      };
}

export function mergeSecurityDataScopeQueryFilter(
  baseFilter: SecurityDataScopeQueryFilter,
  dataScopeFilter: SecurityDataScopeQueryFilter,
): SecurityDataScopeQueryFilter {
  if (Object.keys(dataScopeFilter).length === 0) {
    return { ...baseFilter };
  }

  if (Object.keys(baseFilter).length === 0) {
    return { ...dataScopeFilter };
  }

  return {
    AND: [baseFilter, dataScopeFilter],
  };
}

async function collectRoleScope(
  dataScope: SecurityDataScopeType,
  context: {
    roleCode: string;
    profile: SecurityDataScopeProfile;
    roleDeptIds: readonly string[];
    repository: Pick<SecurityDataScopeRepository, 'listDescendantDeptIds'>;
    userIds: Set<string>;
    deptIds: Set<string>;
    reasons: Set<string>;
  },
): Promise<void> {
  if (dataScope === 'self') {
    context.userIds.add(context.profile.userId);
    context.reasons.add(`${context.roleCode}:self`);
    return;
  }

  if (dataScope === 'custom') {
    for (const deptId of context.roleDeptIds) {
      context.deptIds.add(deptId);
    }
    context.reasons.add(`${context.roleCode}:custom`);
    return;
  }

  if (dataScope === 'own_dept') {
    collectOwnDeptScope(context);
    return;
  }

  if (dataScope === 'dept_tree') {
    await collectDeptTreeScope(context);
  }
}

function collectOwnDeptScope(context: {
  roleCode: string;
  profile: SecurityDataScopeProfile;
  userIds: Set<string>;
  deptIds: Set<string>;
  reasons: Set<string>;
}): void {
  if (context.profile.deptId) {
    context.deptIds.add(context.profile.deptId);
    context.reasons.add(`${context.roleCode}:own_dept`);
    return;
  }

  context.userIds.add(context.profile.userId);
  context.reasons.add(`${context.roleCode}:own_dept:fallback_self`);
}

async function collectDeptTreeScope(context: {
  roleCode: string;
  profile: SecurityDataScopeProfile;
  repository: Pick<SecurityDataScopeRepository, 'listDescendantDeptIds'>;
  userIds: Set<string>;
  deptIds: Set<string>;
  reasons: Set<string>;
}): Promise<void> {
  if (!context.profile.deptId) {
    context.userIds.add(context.profile.userId);
    context.reasons.add(`${context.roleCode}:dept_tree:fallback_self`);
    return;
  }

  context.deptIds.add(context.profile.deptId);
  for (const deptId of await context.repository.listDescendantDeptIds(
    context.profile.deptId,
  )) {
    context.deptIds.add(deptId);
  }
  context.reasons.add(`${context.roleCode}:dept_tree`);
}
