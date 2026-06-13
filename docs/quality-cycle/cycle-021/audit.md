# cycle-021 Audit

Date: 2026-06-13

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
Round 68 also exposed the Admin generated-types race, so Admin `typecheck` and
`lint` must run sequentially.

## Guarded Failures

- Duplicate `/api/api` login is blocked by deploy/Admin smoke.
- Stale Admin deployment is blocked by built bundle markers.
- Revoked sessions/tokens must return 401.
- Notice outbox smoke covers pending handoff, retry, process-to-sent, signed
  callback sync, scheduled retry caps, SMS HTTP host allowlist, SMTP
  config-vault auth, mail subject persistence, provider failedCount and sent
  mutation guards.
- Operation-log cleanup smoke covers guard failures, deleted-detail 404 and
  clean-all target removal.
- Config smoke covers runtime shape and no plaintext secret storage.
- Monitor Jobs smoke covers operations summary, registry, job policy guards,
  enable/disable, disabled-trigger rejection, manual trigger, handler
  execution, failed retry and run-log detail.

## Documentation Finding

The low-signal docs were per-round reports, copied gate text and repeated
reference disclaimers. Keep only current state, guard matrix, active queue and
real incident decisions. Do not create per-round reports by default.

## Residual Risk

- Notice still needs realtime push, broader provider-secret injection,
  STARTTLS/attachments and provider diagnostics before provider-depth parity.
- Config still needs multi-environment governance and external KMS/rotation.
- Scheduler still needs external worker/cron parity beyond the current
  registered manual executor; operation-log enrichment and OpenForge Admin
  remain P2 foundation work.

## Trigger Next Audit

Audit again when a repeated failure returns, docs grow faster than code, a new
P0/P1 foundation domain starts, or public smoke fails after local tests pass.
