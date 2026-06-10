import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@opencore/contracts';

export const REQUIRED_PERMISSIONS_KEY = 'opencore.requiredPermissions';

export function RequirePermission(...permissionCodes: PermissionCode[]) {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, permissionCodes);
}
