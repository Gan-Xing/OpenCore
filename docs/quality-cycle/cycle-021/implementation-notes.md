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

Cycle-021 has completed 77 deployable stages across
System/Security/Monitor/Integration foundations. Round 77 added provider
diagnostics for readiness checks, config-vault hints, outbox backlog, last
failure and operator actions.

## Guard Register

- API prefix: deploy/Admin smoke reject duplicate `/api/api` login.
- Admin bundle: deploy script checks built chunks and current page markers.
- Session revocation: auth, online-user and login-log smokes require revoked
  tokens to return 401.
- Notice outbox: smoke covers pending handoff, idempotent execute, blank
  failure rejection, failed-to-retry, process-to-sent sync, signed callback
  sync, scheduled retry caps, SMS HTTP host allowlist, SMTP config-vault auth,
  mail outbox subject persistence, provider diagnostics, provider failures and
  sent-state mutation guards.
- Operation log: smoke covers batch-delete guards, deleted-detail 404 and
  clean-all target removal while preserving the clean request audit row.
- Config/secret: smoke covers feature flags, audience rules and no plaintext
  secret-vault leakage.
- Monitor jobs: smoke covers operations summary, whitelisted job upsert,
  registry, unsafe policy guards, enable/disable, disabled-trigger rejection,
  run-now, handler execution, failed retry and run-log detail. Deploy also
  checks the Jobs Admin bundle markers.
- Prisma schema/seed drift: migrations and seed must include every Prisma
  model used by smoke-covered runtime endpoints.
- Admin generated types: run Admin `typecheck` and `lint` sequentially because
  both can call `max setup`.
- Seed drift: Prisma integration tests must create and clean the records they
  require.
- Shared Prisma DB: package-level integration specs run with one worker where
  they touch common fixtures.
- Documentation noise: `quality-docs:check` blocks command-log accumulation.

## Remaining Foundation Debt

- Notice: WebSocket realtime push, broader provider-secret injection,
  STARTTLS/attachments and any admitted tenant/member/mobile channels.
- Config: multi-environment governance, external KMS, key rotation and secret
  version history.
- Login log: optional external GeoIP depth and broader mobile/social login
  semantics.
- Operation log: retention scheduling and enrichment beyond cleanup controls.
- Scheduler/monitor: external worker/cron/queue-metric parity beyond the
  current registered manual executor.
- OpenForge Admin: plan/diff/check/apply/manifest/rollback UI.
