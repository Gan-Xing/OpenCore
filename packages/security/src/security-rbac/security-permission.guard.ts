import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityAuthService } from '../security-auth';
import {
  REQUIRED_PERMISSIONS_KEY,
  REQUIRE_AUTHENTICATED_KEY,
} from './security-rbac.decorators';
import type { SecurityRequestWithAuth } from './security-rbac.request';

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

    if (requiredPermissions.length === 0) {
      return true;
    }

    const missingPermission = requiredPermissions.find(
      (permissionCode) => !user.permissionCodes.includes(permissionCode),
    );

    if (missingPermission) {
      throw new ForbiddenException(`Missing permission: ${missingPermission}`);
    }

    return true;
  }
}
