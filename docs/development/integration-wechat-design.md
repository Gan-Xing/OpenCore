# WeChat Integration Design

OpenCore treats WeChat as an integration provider, not as a core business module.

## Boundary

- Store provider configuration in `integration.provider`.
- Store credentials only through `secret://` references.
- Expose health checks and enable/disable status.
- Require signature validation before accepting callbacks.
- Write every callback, template change, and enable/disable action to audit logs.
- OpenForge schemas for WeChat provider Admin pages must mark provider config,
  secret refs, tokens, API keys, client secrets, authorization headers and
  callback payloads as `sensitive` or `detailOnly` so generated list/detail/CSV
  output uses shared redaction helpers.

## Not In Scope

- WeChat commerce workflows.
- Mini-program business domain logic.
- Payment callbacks.
- CRM/member/mall coupling.

## Admission

Before implementation, a WeChat module must pass `docs/development/module-admission-checklist.md` and define provider code, callback paths, signature rules, permissions, Admin route, SDK client, tests, and rollback plan.
