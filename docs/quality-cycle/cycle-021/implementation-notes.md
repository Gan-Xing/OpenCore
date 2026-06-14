# cycle-021 Implementation Notes

Date: 2026-06-14

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

Cycle-021 has completed 88 deployable stages across
System/Security/Monitor/Integration/Tools foundations. Round 88 added
Scheduler/monitor worker parity backed by API/SDK/Admin/OpenAPI for due cron
dispatch, queued schedule runs, worker claim execution and scheduler queue
metrics.

## Guard Register

- API prefix: deploy/Admin smoke reject duplicate `/api/api` login.
- Admin bundle: deploy script checks built chunks and current page markers.
- Session revocation: auth, online-user and login-log smokes require revoked
  tokens to return 401.
- Notice outbox: smoke covers pending handoff, idempotent execute, blank
  failure rejection, failed-to-retry, process-to-sent sync, signed callback
  sync, scheduled retry caps, SMS HTTP host allowlist, SMTP config-vault auth,
  SMTP TLS policy, SMS HTTP secret injection, mail outbox subject persistence,
  SMTP attachments, authenticated inbox realtime events, provider diagnostics,
  provider failures and sent-state mutation guards.
- Operation log: smoke covers batch-delete guards, deleted-detail 404,
  duration/location filters, retentionDays cleanup and the retention scheduler
  job registry while preserving the clean request audit row.
- Config/secret: smoke covers feature flags, audience rules, environment
  overrides, legacy vault envelope deserialization, secret version history,
  explicit secret rotation, vault key rotation and no plaintext secret-vault
  leakage.
- Monitor jobs: smoke covers operations summary, whitelisted job upsert,
  registry, unsafe policy guards, enable/disable, disabled-trigger rejection,
  run-now, handler execution, failed retry, run-log detail, cron dispatch,
  worker claim and scheduler queue metrics. Deploy also checks the Jobs and
  Queues Admin bundle markers.
- OpenForge: smoke covers status, doctor, plan, diff, check, apply dry-run,
  manifest list, rollback dry-run and unsafe schema/config/manifest guards.
  Deploy checks Admin workbench markers.
- Integration: smoke covers provider-wide health audit, diagnostics parity,
  config-vault debt, outbox backlog, failure history and secret-leak guards.
  Deploy checks Admin health/config audit markers.
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

- Notice: optional multi-instance realtime fanout if deployment topology moves
  beyond the current single-node process, plus any admitted
  tenant/member/mobile channels.
- Config: managed cloud KMS provider adapters are optional deployment
  integration beyond the current env-bound keyring.
- Login log: optional external GeoIP depth and broader mobile/social login
  semantics.
- Operation log: optional external GeoIP attribution beyond deterministic
  network categories.
- OpenForge: write/apply confirmation UX, manifest detail and rollback
  execution remain later stages; direct schema/migration/business writes still
  require user admission.
