import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_DATA_SCOPE_KEY,
  type SecurityDataScopeOptions,
} from './security-data-scope.decorators';
import type { SecurityRequestWithDataScope } from './security-data-scope.request';
import { SecurityDataScopeService } from './security-data-scope.service';

@Injectable()
export class SecurityDataScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataScopes: SecurityDataScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<SecurityDataScopeOptions>(
      REQUIRED_DATA_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<SecurityRequestWithDataScope>();
    const user =
      request.user ??
      (await this.dataScopes.authenticate(request.headers.authorization));

    request.user = user;
    request.dataScope = {
      constraint: await this.dataScopes.resolveForUser(user),
      queryFields: {
        userIdField: options.userIdField,
        deptIdField: options.deptIdField,
      },
    };
    return true;
  }
}
