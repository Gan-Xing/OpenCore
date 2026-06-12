import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityAuthService } from '../security-auth';
import { REQUIRED_PERMISSIONS_KEY } from './security-rbac.decorators';
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

    if (requiredPermissions.length === 0) {
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
    const missingPermission = requiredPermissions.find(
      (permissionCode) => !user.permissionCodes.includes(permissionCode),
    );

    if (missingPermission) {
      throw new ForbiddenException(`Missing permission: ${missingPermission}`);
    }

    request.user = user;
    return true;
  }
}
