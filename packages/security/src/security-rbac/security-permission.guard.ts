import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createApiErrorBody } from '@opencore/common';
import type { PermissionCode } from '@opencore/contracts';
import { setRequestActorContext } from '@opencore/core';
import { SecurityAuthService } from '../security-auth';
import {
  REQUIRED_PERMISSIONS_KEY,
  REQUIRE_AUTHENTICATED_KEY,
} from './security-rbac.decorators';
import type { SecurityRequestWithAuth } from './security-rbac.request';

const PERMISSION_COMPATIBILITY_ALIASES = {
  'industry:crm:read': ['business:core:read'],
  'industry:crm:create': ['business:core:create'],
  'industry:crm:update': ['business:core:update'],
  'industry:crm:assign': ['business:core:assign'],
  'industry:crm:comment': ['business:core:comment'],
  'industry:crm:export': ['business:core:export'],
  'industry:crm:delete': ['business:core:delete'],
  'business:core:read': ['industry:crm:read'],
  'business:core:create': ['industry:crm:create'],
  'business:core:update': ['industry:crm:update'],
  'business:core:assign': ['industry:crm:assign'],
  'business:core:comment': ['industry:crm:comment'],
  'business:core:export': ['industry:crm:export'],
  'business:core:delete': ['industry:crm:delete'],
} as const satisfies Partial<Record<PermissionCode, readonly PermissionCode[]>>;

const permissionCompatibilityAliasesByCode =
  PERMISSION_COMPATIBILITY_ALIASES as Readonly<
    Record<string, readonly string[]>
  >;

@Injectable()
export class SecurityPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: SecurityAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const requiresAuthenticated =
      this.reflector.getAllAndOverride<boolean>(REQUIRE_AUTHENTICATED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true;

    if (requiredPermissions.length === 0 && !requiresAuthenticated) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<SecurityRequestWithAuth>();
    const user =
      request.user ??
      (await this.authService.authenticateBearer(
        request.headers.authorization,
      ));
    request.user = user;
    setRequestActorContext({
      accessMode: user.accessMode,
      actorUserId: user.id,
      membershipId: user.activeMembership?.id,
      tenantId: user.activeTenant?.id,
    });

    if (requiredPermissions.length === 0) {
      return true;
    }

    const missingPermission = requiredPermissions.find(
      (permissionCode) =>
        !hasRequiredPermission(user.permissionCodes, permissionCode),
    );

    if (missingPermission) {
      throw new ForbiddenException(
        createApiErrorBody({
          code: 'RBAC_PERMISSION_MISSING',
          message: `Missing permission: ${missingPermission}`,
          details: { permissionCode: missingPermission },
        }),
      );
    }

    return true;
  }
}

function hasRequiredPermission(
  grantedPermissionCodes: readonly string[],
  requiredPermissionCode: string,
): boolean {
  if (grantedPermissionCodes.includes(requiredPermissionCode)) {
    return true;
  }

  const aliases =
    permissionCompatibilityAliasesByCode[requiredPermissionCode] ?? [];

  return aliases.some((alias) => grantedPermissionCodes.includes(alias));
}
