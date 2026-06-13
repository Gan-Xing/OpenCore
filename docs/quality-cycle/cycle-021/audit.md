# cycle-021 Audit

Date: 2026-06-13

This audit tracks current risk and self-correction. It is intentionally short;
the old file repeated round summaries and command boilerplate now covered by
`round-history.md` and the ledger.

## Current Conclusion

OpenCore's foundation productization is progressing, but two self-caused
patterns had to be corrected:

- Round 13 under-scoped online-user by stopping at list/detail/kick-out until
  Round 14 added real token/session revocation.
- Round 66 used the wrong notice provider state semantics by treating queued
  external outbox handoff as `sent`; Round 67 corrected the state machine.
- Round 69 moved the next notice reliability step into code by adding an
  explicit queued outbox process path instead of another manual state note.
- Round 70 moved signed outbox callback intake into code with HMAC signature
  guards and smoke coverage instead of leaving callbacks as a reference note.
- Round 68 exposed another process issue: running Admin `typecheck` and `lint`
  in parallel can race `max setup` generated types. Those commands must run
  sequentially when both touch Admin generated files.

Those issues are now guard requirements, not memory items.

## Guarded Failure Classes

- Login prefix regression: duplicate `/api/api` login is blocked by deploy/Admin
  smoke.
- Stale Admin deployment: deploy script checks built bundle markers for changed
  pages.
- Session/token revocation: auth/online-user/login-log smokes verify revoked
  tokens fail.
- Notice outbox semantics: smoke verifies pending handoff, retry, provider
  process-to-sent, signed callback sync and explicit sent mutation guards.
- Operation-log cleanup: smoke verifies batch-delete guards, deleted-detail 404
  and clean-all target removal.
- Config/secret drift: smoke verifies runtime config shape and no plaintext
  secret storage.

## Documentation Findings

The main low-signal docs were the 68 per-round reports and aggregate files that
repeated the same command lists and "reference comparison" wording. The
per-round reports have been removed; aggregate files now keep only current
state, guard matrix and active queue.

Going forward:

- Aggregate docs must stay under control.
- Do not create per-round completion reports by default.
- Standard command output belongs in the final response or terminal history,
  not copied into every doc.

## Current Residual Risk

- Notice still needs real SMTP/SMS adapters, retry scheduling and realtime
  push before claiming full provider delivery depth.
- Config still needs multi-environment governance and external KMS/rotation for
  a stronger enterprise posture.
- Operation-log retention scheduling/enrichment, scheduler/monitor and
  OpenForge Admin still need deeper operator workflows.

## Next Audit Trigger

Run another audit when one of these happens:

- a repeated failure appears again,
- a round adds more documentation than code without a clear reason,
- a new P0/P1 foundation domain is about to start,
- a deployed public smoke fails after local tests passed.
