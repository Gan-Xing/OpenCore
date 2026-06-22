import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createApiErrorBody } from '@opencore/common';
import { setRequestActorContext } from '@opencore/core';
import { SecurityAuthService } from '../security-auth';
import { REQUIRED_ROLES_KEY } from './security-rbac.decorators';
import type { SecurityRequestWithAuth } from './security-rbac.request';

@Injectable()
export class SecurityRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: SecurityAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
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
    const hasRole = requiredRoles.some((roleCode) =>
      user.roleCodes.includes(roleCode),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        createApiErrorBody({
          code: 'RBAC_ROLE_MISSING',
          message: `Missing role: ${requiredRoles.join(' or ')}`,
          details: { roleCodes: requiredRoles },
        }),
      );
    }

    request.user = user;
    setRequestActorContext({
      accessMode: user.accessMode,
      actorUserId: user.id,
      membershipId: user.activeMembership?.id,
      tenantId: user.activeTenant?.id,
    });
    return true;
  }
}
