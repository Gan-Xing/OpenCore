# cycle-021 Audit

Date: 2026-06-14

## Conclusion

Progress is real, but two self-caused under-scoping defects had to be
corrected:

- Round 13 stopped online-user at list/detail/kick-out; Round 14 added real
  token/session revocation.
- Round 66 treated queued external outbox handoff as provider `sent`; Round 67
  fixed the state model.

Recent guard work moved the next notice reliability steps into code: Round 69
added queued provider processing, Round 70 added signed callbacks, Round 71
added bounded retry scheduling, Round 72 added a bounded SMS HTTP adapter and
Round 73 added SMTP mail delivery. Round 74 moved Monitor Jobs Admin off
fixtures and caught a missing `ReportDefinition` migration/seed drift through
runtime smoke. Round 75 added Monitor Jobs registry visibility, registered
handler execution and failed retry diagnostics. Round 76 replaced the old
payload subject fallback with first-class mail outbox subject persistence.
Round 77 added provider diagnostics for readiness, config-vault hints, outbox
backlog, last failure and operator actions.
Round 78 added SMS HTTP config-vault secret injection into headers, query
parameters and JSON body fields.
Round 79 added first-class SMTP attachments with bounded validation,
persistence and MIME smoke coverage.
Round 80 added explicit SMTP `tlsMode` policy and deprecated TLS-field guards
with STARTTLS-required smoke coverage.
Round 81 added authenticated SSE notice inbox realtime events with snapshot and
read-event smoke coverage.
Round 82 added public config environment overrides with runtime/evaluate
resolution, secret/default-environment guards and delete fallback smoke
coverage.
Round 83 added config secret version history and explicit rotation with seeded
version, non-secret/blank guard and plaintext-leakage smoke coverage.
Round 84 added env-bound KMS keyring status, v2 key-ID envelopes, legacy
unversioned vault-envelope deserialization guards and current/versioned secret
rewrap through vault key rotation.
Round 85 added operation-log duration/location enrichment, retentionDays
cleanup and scheduled retention job registration.
Round 86 moved OpenForge Admin from static text to a live safe workbench and
added repo-root-safe generator-core readers so API/runtime tests no longer
depend on caller cwd.
Round 87 moved Integration provider health from per-provider diagnostics to a
global health/config audit with readiness totals, config-vault debt, outbox
backlog, failure history and live Admin visibility.
Round 88 added Scheduler/monitor cron dispatch, queued schedule runs, worker
claim execution and scheduler queue metrics with Admin controls and smoke
coverage.
Round 89 added OpenForge dry-run confirmation, API write-intent rejection and
manifest preview/detail through SDK/Admin with smoke coverage.
Round 68 also exposed the Admin generated-types race, so Admin `typecheck` and
`lint` must run sequentially.

## Guarded Failures

- Duplicate `/api/api` login is blocked by deploy/Admin smoke.
- Stale Admin deployment is blocked by built bundle markers.
- Revoked sessions/tokens must return 401.
- Notice outbox smoke covers pending handoff, retry, process-to-sent, signed
  callback sync, scheduled retry caps, SMS HTTP host allowlist, SMTP
  config-vault auth, SMTP TLS policy, SMS HTTP secret injection, mail subject
  persistence, SMTP attachments, authenticated inbox realtime events, provider
  diagnostics, provider failedCount and sent mutation guards.
- Operation-log smoke covers guard failures, deleted-detail 404,
  duration/location filters, retentionDays cleanup and scheduled retention job
  registry.
- Config smoke covers runtime shape, environment override governance, legacy
  vault envelope deserialization, secret version history, secret rotation,
  vault key rotation and no plaintext secret storage.
- Monitor Jobs smoke covers operations summary, registry, job policy guards,
  enable/disable, disabled-trigger rejection, manual trigger, handler
  execution, failed retry, run-log detail, cron dispatch, worker claim and
  scheduler queue metrics.
- OpenForge smoke covers status, doctor, plan, diff, check, apply dry-run,
  manifest list, manifest preview, rollback dry-run, dry-run confirmation,
  write-intent rejection and unsafe schema/config/manifest guards.
- Integration health smoke covers provider-wide readiness totals,
  config-vault debt, outbox backlog, diagnostics parity, failure history and
  secret-leak guards.

## Documentation Finding

The low-signal docs were per-round reports, copied gate text and repeated
reference disclaimers. Keep only current state, guard matrix, active queue and
real incident decisions. Do not create per-round reports by default.

## Residual Risk

- Notice realtime is single-node process-local; multi-instance fanout remains a
  deployment-topology upgrade if needed.
- Managed cloud KMS provider adapters are optional deployment integration; the
  current foundation waterline has env-bound keyring status and rotation.
- OpenForge direct generated schema/migration/business writes remain outside
  the admitted surface.

## Trigger Next Audit

Audit again when a repeated failure returns, docs grow faster than code, a new
P0/P1 foundation domain starts, or public smoke fails after local tests pass.
