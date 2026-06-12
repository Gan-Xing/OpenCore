import type { AuthenticatedUser } from '../security-auth';
import type {
  SecurityDataScopeConstraint,
  SecurityDataScopeQueryFields,
} from './security-data-scope.policy';

export type SecurityDataScopeContext = {
  constraint: SecurityDataScopeConstraint;
  queryFields: SecurityDataScopeQueryFields;
};

export type SecurityRequestWithDataScope = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
  dataScope?: SecurityDataScopeContext;
};
