import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@opencore/contracts';

export const REQUIRED_PERMISSIONS_KEY = 'opencore.requiredPermissions';
export const REQUIRED_ROLES_KEY = 'opencore.requiredRoles';
export const REQUIRE_AUTHENTICATED_KEY = 'opencore.requireAuthenticated';

export function RequireAuthenticated() {
  return SetMetadata(REQUIRE_AUTHENTICATED_KEY, true);
}

export function RequirePermission(...permissionCodes: PermissionCode[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, permissionCodes);
}

export function RequireRole(...roleCodes: string[]) {
  return SetMetadata(REQUIRED_ROLES_KEY, roleCodes);
}
