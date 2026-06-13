# cycle-021 Implementation Notes

Date: 2026-06-13

This file is now the compact implementation record for cycle-021. It should
not repeat full command logs or round-by-round prose. Detailed historical
evidence stays in the per-round completion reports and the quality-cycle
ledger.

## Documentation Discipline

- Do not paste the same test, build, deploy and smoke command list into every
  aggregate doc.
- For each round, record only the capability, the user-visible behavior, the
  unique guard added, the deploy/public verification marker and any unresolved
  debt.
- If a defect repeats, add a code test, smoke check or deploy-script guard and
  name that guard here. Do not rely on memory or another paragraph of warning.
- Feature code, tests, deploy guards and docs for one stage should land
  together. Use a docs-only commit only when runtime artifacts do not change.
- Avoid self-hash placeholders. A same-commit hash cannot be written inside
  that commit; report it after commit or backfill it in the next metadata pass.

## Execution Contract

- Fixed deploy path: `pnpm deploy:opencore`.
- Fixed ports: API `39172`, Admin `39174`, local smoke `39173`.
- Runtime smoke must protect the recurring failures: duplicate `/api/api`
  login prefix, stale Admin bundle, deserialization drift and revoked
  session/token behavior.
- P0/P1 foundation work is auto-admissible as independent rounds. Large
  business domains, production multi-tenancy, real payments, BPMN/full
  workflow, full report designer, RAG/Agent/AI workflow and OpenForge direct
  schema/business-code writing still need explicit user admission.
- OpenCore carries no legacy compatibility burden during this phase. Replace
  stale DTOs, SDK shapes, routes, seeds and Admin flows directly when the
  current waterline is better.

## Current Runtime State

Cycle-021 has completed 67 deployable stages. The project is no longer a
skeleton: API, SDK, Admin, permissions, seed data, OpenAPI snapshots and smoke
guards exist across the main System/Security/Monitor/Integration foundation
areas.

The latest runtime stage is Round 67:

- Capability: `core.notice` and Integration outbox status hardening.
- Defect closed: Round 66 treated queued mail/SMS outbox handoff as
  `providerStatus=sent`.
- Correct state model: external mail/SMS outbox handoff keeps notice delivery
  `pending`; explicit outbox `failed`, `retry` and `sent` transitions sync
  back to the delivery row.
- Idempotency: repeat execute skips deliveries that already have a
  `providerMessageId`.
- Admin: System Notices delivery modal exposes outbox actions and provider
  message state.
- API/OpenAPI/SDK: mail and SMS outbox `failed`, `retry` and `sent` endpoints
  are typed and guarded.

## Verification Evidence To Keep

Keep only these high-signal markers in aggregate docs:

- Focused tests passed for Integration repository/permission matrix,
  System Notice repository and SDK Integration/System clients.
- Full gates passed for Prisma validate/generate, OpenAPI export/check,
  SDK check, typecheck, lint, API/Admin build and full test/build suites.
- Local smoke passed on fixed port `39173`.
- Deployment completed through `pnpm deploy:opencore` on API `39172` and Admin
  `39174`.
- Public smoke passed against `http://144.217.243.161:39172`.
- Public Admin chunk at `http://144.217.243.161:39174` contains the outbox
  action markers.
- Public OpenAPI at `/api/docs-json` contains the six outbox state endpoints.

The exact command output does not belong here unless a command is unique to a
new guard.

## Guard Register

- Duplicate login prefix: deploy script and Admin smoke reject `/api/api`
  login regressions.
- Stale Admin bundle: deploy script checks current built chunks and required
  page markers.
- Notice outbox state: `smoke-core-notice.mjs` verifies pending handoff,
  repeat execute idempotency, blank failure rejection, failed-to-retry-to-sent
  sync and mutation guards after sent.
- Secret/config drift: config smoke verifies runtime feature flags, audience
  rules and secret-vault plaintext protection.
- Session revocation: auth, online-user and login-log smokes verify kicked or
  logged-out tokens return 401.

## Remaining Foundation Debt

- Notice: real external SMTP/SMS provider execution or callback ingestion,
  WebSocket realtime push and any admitted tenant/member/mobile channels.
- Config: multi-environment rollout governance, external KMS binding, key
  rotation and secret version history.
- Login log: optional external GeoIP provider depth and broader mobile/social
  login semantics.
- Operation log: retention/cleanup governance and structured enrichment.
- Scheduler/monitor: job operation depth, retries/timeouts and richer runtime
  diagnostics.
- OpenForge Admin: safe plan/diff/check/apply/manifest/rollback UI over the
  existing generator boundary.

## Next-Round Rule

Before opening the next feature round, check `handoff.md`, this file,
`productization-waterline-audit.md`, `backlog.md`, `reference-comparison.md`
and `audit.md` for alignment. Do not grow these aggregate docs with repeated
per-round command transcripts.
