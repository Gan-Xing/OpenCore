import { SetMetadata } from '@nestjs/common';

export const REQUIRED_DATA_SCOPE_KEY = 'opencore.requiredDataScope';

export type SecurityDataScopeOptions = {
  userIdField?: string;
  deptIdField?: string;
};

export function RequireDataScope(options: SecurityDataScopeOptions = {}) {
  return SetMetadata(REQUIRED_DATA_SCOPE_KEY, options);
}
