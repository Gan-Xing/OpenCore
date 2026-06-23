export type SecurityDataScopeType =
  | 'all'
  | 'custom'
  | 'dept_tree'
  | 'own_dept'
  | 'self';

export type SecurityDataScopeRole = {
  roleCode: string;
  dataScope: SecurityDataScopeType;
  dataScopeDeptIds: readonly string[];
};

export type SecurityDataScopeProfile = {
  userId: string;
  deptId?: string;
  roles: readonly SecurityDataScopeRole[];
};

export abstract class SecurityDataScopeRepository {
  abstract getDataScopeProfileForUser(
    userId: string,
    membershipId?: string,
  ): Promise<SecurityDataScopeProfile | undefined>;

  abstract listDescendantDeptIds(deptId: string): Promise<string[]>;
}
