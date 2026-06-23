import { Injectable } from '@nestjs/common';
import { SecurityAuthService, type AuthenticatedUser } from '../security-auth';
import {
  resolveSecurityDataScopeConstraint,
  type SecurityDataScopeConstraint,
} from './security-data-scope.policy';
import { SecurityDataScopeRepository } from './security-data-scope.repository';

@Injectable()
export class SecurityDataScopeService {
  constructor(
    private readonly repository: SecurityDataScopeRepository,
    private readonly authService: SecurityAuthService,
  ) {}

  async authenticate(
    authorization: string | undefined,
  ): Promise<AuthenticatedUser> {
    return this.authService.authenticateBearer(authorization);
  }

  async resolveForUser(
    user: AuthenticatedUser,
  ): Promise<SecurityDataScopeConstraint> {
    return resolveSecurityDataScopeConstraint(
      await this.repository.getDataScopeProfileForUser(
        user.id,
        user.activeMembership?.id,
      ),
      this.repository,
    );
  }
}
