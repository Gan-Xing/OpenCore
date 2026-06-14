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

Cycle-021 has completed 94 deployable stages across
System/Security/Monitor/Integration/Tools foundations. Round 91 added
token/session blacklist maintenance with registered-token allowlist
enforcement, expired-session cleanup, API/SDK/Admin/OpenAPI visibility, smoke
and Admin deploy markers. Round 92 added OAuth token inventory, summary,
detail and revoke lifecycle with Prisma model/seed, SDK/Admin/OpenAPI
visibility, dedicated smoke and Admin deploy markers. Round 93 added a
guarded external HTTP JSON GeoIP adapter with host allowlisting, bounded
timeouts, non-public-IP no-send behavior and offline fallback diagnostics.
Round 94 added a managed HTTP JSON KMS adapter with v3 secret-vault envelopes
and remote data-key wrap/unwrap while preserving env as the default provider.

## Guard Register

- API prefix: deploy/Admin smoke reject duplicate `/api/api` login.
- Admin bundle: deploy script checks built chunks and current page markers.
- Session revocation: auth, online-user and login-log smokes require revoked
  tokens to return 401; online-user unit tests also reject unknown and expired
  token sessions.
- Notice outbox: smoke covers pending handoff, idempotent execute, blank
  failure rejection, failed-to-retry, process-to-sent sync, signed callback
  sync, scheduled retry caps, SMS HTTP host allowlist, SMTP config-vault auth,
  SMTP TLS policy, SMS HTTP secret injection, mail outbox subject persistence,
  SMTP attachments, authenticated inbox realtime events, provider diagnostics,
  provider failures and sent-state mutation guards.
- Operation log: smoke covers batch-delete guards, deleted-detail 404,
  duration/location filters, retentionDays cleanup and the retention scheduler
  job registry while preserving the clean request audit row.
- IP/location: login-log smoke covers provider status, OpenAPI paths,
  documentation-network lookup, invalid lookup and missing-IP guards; common
  tests cover the external HTTP JSON provider, host allowlist, non-public-IP
  no-send behavior and fallback diagnostics; Admin deploy checks external
  GeoIP adapter and lookup markers.
  Enable with `OPENCORE_IP_LOCATION_PROVIDER=opencore.http-json`,
  `OPENCORE_IP_LOCATION_ENDPOINT_URL` and
  `OPENCORE_IP_LOCATION_ALLOWED_HOSTS`; optional auth uses
  `OPENCORE_IP_LOCATION_AUTH_HEADER_NAME/VALUE`.
- Online users: smoke covers summary, expired cleanup, force-logout audit and
  revoked-token rejection; deploy checks token blacklist maintenance markers.
- Config/secret: smoke covers feature flags, audience rules, environment
  overrides, legacy vault envelope deserialization, secret version history,
  explicit secret rotation, vault key rotation, managed KMS provider status,
  v3 managed envelopes and no plaintext secret-vault leakage.
  Enable managed KMS with `OPENCORE_CONFIG_KMS_PROVIDER=opencore.http-json`,
  `OPENCORE_CONFIG_KMS_WRAP_URL`, `OPENCORE_CONFIG_KMS_UNWRAP_URL` and
  `OPENCORE_CONFIG_KMS_ALLOWED_HOSTS`; optional auth uses
  `OPENCORE_CONFIG_KMS_AUTH_HEADER_NAME/VALUE`.
- Monitor jobs: smoke covers operations summary, whitelisted job upsert,
  registry, unsafe policy guards, enable/disable, disabled-trigger rejection,
  run-now, handler execution, failed retry, run-log detail, cron dispatch,
  worker claim and scheduler queue metrics. Deploy also checks the Jobs and
  Queues Admin bundle markers.
- OpenForge: smoke covers status, doctor, plan, diff, check, apply dry-run,
  manifest list, manifest preview, rollback dry-run, dry-run confirmation
  guards, write-intent rejection and unsafe schema/config/manifest guards.
  Deploy checks Admin workbench, confirmation and manifest markers.
- Integration: smoke covers provider-wide health audit, diagnostics parity,
  config-vault debt, outbox backlog, failure history and secret-leak guards;
  OAuth token smoke covers summary, list/detail, revoke, idempotent revoke and
  secret-leak guards. Deploy checks Admin health/config audit and OAuth token
  markers.
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
- Login/operation log: automatic historical log backfill with external GeoIP
  precision is not part of the current request-time lookup surface.
- OpenForge: direct schema/migration/business writes still require user
  admission.
