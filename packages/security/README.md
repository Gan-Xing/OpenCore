# @opencore/security

OpenCore security-domain package.

The package is filled in dependency order. Admitted subdomains:

- `security-auth`: authentication user port, login/session service, bearer token
  signing and verification, password hashing and login-attempt recording
  contract.
- `security-rbac`: permission and role metadata decorators plus NestJS guards
  that resolve the current authenticated user through `security-auth`.
- `security-data-scope`: data-scope metadata decorator, guard, repository port
  and query-policy helpers for turning user/role/dept context into reusable
  data access constraints.

Later self-loop rounds will add audit login/operation logs in the documented
order.
