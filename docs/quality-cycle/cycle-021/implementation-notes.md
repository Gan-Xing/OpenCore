# cycle-021 Implementation Notes

Date: 2026-06-13

This is the compact implementation record. Keep only current guard facts,
active debt and decisions that change future execution.

## Execution Contract

- Deploy path: `pnpm deploy:opencore`.
- Ports: API `39172`, Admin `39174`, local smoke `39173`.
- P0/P1 foundation work is auto-admissible; large business domains,
  production multi-tenancy, real payments, BPMN/full workflow, full report
  designer, RAG/Agent/AI workflow and OpenForge direct schema/business writes
  need explicit user admission.
- No legacy compatibility burden: replace stale DTOs, SDK shapes, routes,
  seeds and Admin flows directly.
- Do not paste standard test/build/deploy command lists into docs.

## Runtime State

Cycle-021 has completed 72 deployable stages across
System/Security/Monitor/Integration foundations. Round 72 added a bounded SMS
HTTP provider adapter with allowlisted endpoint validation, failedCount
reporting and failed delivery-state sync.

## Guard Register

- API prefix: deploy/Admin smoke reject duplicate `/api/api` login.
- Admin bundle: deploy script checks built chunks and current page markers.
- Session revocation: auth, online-user and login-log smokes require revoked
  tokens to return 401.
- Notice outbox: smoke covers pending handoff, idempotent execute, blank
  failure rejection, failed-to-retry, process-to-sent sync, signed callback
  sync, scheduled retry caps, SMS HTTP host allowlist, non-2xx failures and
  sent-state mutation guards.
- Operation log: smoke covers batch-delete guards, deleted-detail 404 and
  clean-all target removal while preserving the clean request audit row.
- Config/secret: smoke covers feature flags, audience rules and no plaintext
  secret-vault leakage.
- Admin generated types: run Admin `typecheck` and `lint` sequentially because
  both can call `max setup`.
- Seed drift: Prisma integration tests must create and clean the records they
  require.
- Shared Prisma DB: package-level integration specs run with one worker where
  they touch common fixtures.
- Documentation noise: `quality-docs:check` blocks command-log accumulation.

## Remaining Foundation Debt

- Notice: SMTP adapter, provider-secret injection, WebSocket realtime push and
  any admitted tenant/member/mobile channels.
- Config: multi-environment governance, external KMS, key rotation and secret
  version history.
- Login log: optional external GeoIP depth and broader mobile/social login
  semantics.
- Operation log: retention scheduling and enrichment beyond cleanup controls.
- Scheduler/monitor: job operation depth, retries/timeouts and diagnostics.
- OpenForge Admin: plan/diff/check/apply/manifest/rollback UI.
