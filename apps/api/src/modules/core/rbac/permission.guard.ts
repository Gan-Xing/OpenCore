import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';

type RequestWithAuth = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const user = this.authService.authenticateBearer(
      request.headers.authorization,
    );
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
