# cycle-021 Implementation Notes

Date: 2026-06-13

This file is now the compact implementation record for cycle-021. It should
not repeat full command logs or round-by-round prose. Detailed historical
evidence stays in `round-history.md` and the quality-cycle ledger.

## Documentation Discipline

- Do not paste the same test, build, deploy and smoke command list into every
  aggregate doc.
- For each round, record only capability, user-visible behavior, unique guard,
  deploy/public marker and unresolved debt when those facts change current
  state.
- If a defect repeats, add a code test, smoke check or deploy-script guard and
  name that guard here. Do not rely on memory or another paragraph of warning.
- Feature code, tests, deploy guards and docs for one stage should land
  together. Use a docs-only commit only when runtime artifacts do not change.
- Avoid self-hash placeholders. A same-commit hash cannot be written inside
  that commit; report it after commit or backfill it in the next metadata pass.
- Quality-cycle docs are checked by `quality-docs:check`; completed prompts and
  historical reports must stay concise archives, not command transcripts.

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

Cycle-021 has completed 70 deployable stages. API, SDK, Admin, permissions,
seed data, OpenAPI snapshots and smoke guards now exist across the main
System/Security/Monitor/Integration foundation areas.

Latest stage: Round 70 added signed mail/SMS outbox callback intake,
SDK/OpenAPI/Admin support and smoke guards for HMAC verification plus
callback-to-delivery state sync.

## Evidence Rule

Aggregate docs keep only unique guard facts and current public markers. Do not
copy standard test/build/deploy command output into documentation.

## Guard Register

- Duplicate login prefix: deploy script and Admin smoke reject `/api/api`
  login regressions.
- Stale Admin bundle: deploy script checks current built chunks and required
  page markers.
- Notice outbox state: `smoke-core-notice.mjs` verifies pending handoff,
  repeat execute idempotency, blank failure rejection, failed-to-retry,
  process-to-sent sync, signed callback sync and mutation guards after sent.
- Operation-log cleanup: `smoke-core-audit-log.mjs` verifies batch delete
  guard failures, successful deletion, deleted-detail 404 and clean-all target
  removal while preserving the audit record for the clean request itself.
- Secret/config drift: config smoke verifies runtime feature flags, audience
  rules and secret-vault plaintext protection.
- Session revocation: auth, online-user and login-log smokes verify kicked or
  logged-out tokens return 401.
- Admin generated types: do not run Admin `typecheck` and `lint` in parallel,
  because both call `max setup` and can race generated Umi types.
- Seed drift: Prisma integration tests must create and clean the records they
  require when prior smokes can legitimately mutate seed-like runtime tables.
- Shared Prisma test database: `packages/system` Jest runs with one worker so
  package-level integration specs do not race delivery/config/user fixtures.
- Documentation noise: `quality-docs:check` blocks quality-cycle files that
  accumulate repeated command-like lines instead of durable decisions.

## Remaining Foundation Debt

- Notice: real external SMTP/SMS adapters, retry scheduling, WebSocket
  realtime push and any admitted tenant/member/mobile channels.
- Config: multi-environment rollout governance, external KMS binding, key
  rotation and secret version history.
- Login log: optional external GeoIP provider depth and broader mobile/social
  login semantics.
- Operation log: retention policy scheduling and structured enrichment beyond
  the now-live cleanup controls.
- Scheduler/monitor: job operation depth, retries/timeouts and richer runtime
  diagnostics.
- OpenForge Admin: safe plan/diff/check/apply/manifest/rollback UI over the
  existing generator boundary.

## Next-Round Rule

Before opening the next feature round, check `handoff.md`, this file,
`productization-waterline-audit.md`, `backlog.md`, `reference-comparison.md`,
`audit.md` and `round-history.md` for alignment. Do not grow these docs with
repeated command transcripts.
