# cycle-003 Implementation Notes

## Q003-P1-QUERY-FILTER-POLICY

- Added bounded query DTOs for collaboration, operations, and integration list endpoints.
- Added server-side filtering in both seed and Prisma repositories.
- Filters are whitelist fields only: status, recipient, assignee, sourceType, enabled, queueName, prefix, active, owner, type, healthStatus, providerCode.
- Evidence: focused API repository tests passed for collaboration, operations, and integration.

## Q003-P2-SDK-FILTER-CONTRACTS

- Added SDK query request types for collaboration, operations, and integration clients.
- Updated client query serialization to include string/number/boolean filter fields while skipping undefined values.
- Evidence: `NX_DAEMON=false pnpm nx test sdk --runInBand` passed with filtered URL path assertions.

## Q003-P3-OPENFORGE-FILTER-DOC

- Updated `docs/development/openforge-template-authoring.md` and `docs/development/openforge-v1-architecture.md` with bounded list filter guidance.
- Evidence: `pnpm openforge:doctor` and `pnpm openforge:gate` passed.

## Q003-P4-COLLAB-FILTERS

- `GET /collaboration/messages` supports `status` and `recipient`.
- `GET /collaboration/notices` supports `status`.
- `GET /collaboration/todos` supports `status`, `assignee`, and `sourceType`.
- `GET /collaboration/approvals` supports `status`, `requester`, and `approver`.
- Evidence: `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=collaboration` passed with 7 tests.

## Q003-P5-OPERATIONS-FILTERS

- `GET /monitor/jobs` supports `enabled` and `queueName`.
- `GET /monitor/jobs/:code/runs` supports `status`.
- `GET /monitor/cache` supports `prefix`.
- `GET /monitor/online-users` supports `active`.
- `GET /optional/reports` supports `enabled` and `owner`.
- Evidence: `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=operations` passed with 8 tests.

## Q003-P6-INTEGRATION-FILTERS

- `GET /integrations/providers` supports `type`, `enabled`, and `healthStatus`.
- `GET /integrations/mail/templates` and `GET /integrations/sms/templates` support `enabled`.
- `GET /integrations/mail/outbox` and `GET /integrations/sms/outbox` support `status` and `providerCode`.
- `GET /integrations/oauth/providers` supports `enabled` and `healthStatus`.
- Evidence: `NX_DAEMON=false pnpm nx test api --runInBand --testPathPatterns=integration` passed with 8 tests.

## Contract Verification

- `pnpm openapi:export`
- `pnpm openapi:registry-tags:check`
- `pnpm openapi:check`

`pnpm openapi:check` initially failed because `/tmp` was full (`ENOSPC` while writing the regenerated snapshot). Clearing generated temporary cache directories restored `/tmp` capacity, and the rerun passed cleanly.
