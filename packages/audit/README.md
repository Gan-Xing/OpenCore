# @opencore/audit

OpenCore audit-domain package.

Admitted subdomains:

- `audit-login-log`: login attempt records, query/export helpers and the
  `SecurityLoginAttemptRecorder` implementation used by authentication.
- `audit-operation-log`: operation/audit records, metadata decorators, global
  interceptor, query/export helpers and redaction policy.

Later self-loop rounds will add online-user, scheduler and monitor consumers.
