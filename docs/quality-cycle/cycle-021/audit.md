# cycle-021 Audit

Date: 2026-06-15

## Conclusion

Cycle-021 delivered real foundation productization, but it also exposed two
self-caused under-scoping defects that should not repeat:

- Round 13 stopped online-user at list/detail/kick-out; Round 14 added real
  token/session revocation.
- Round 66 treated queued external outbox handoff as provider `sent`; Round 67
  corrected the delivery state model before provider adapters were built on
  top of it.

The corrective rule is now explicit: if a stage creates a semantic bug that
should have been caught in the same stage, add the missing test, smoke or
deploy guard before moving on.

## Accepted Closure

The finite System Admin fallback closure finished in Round 127. The accepted
rows are tracked in `acceptance-matrix.md`; current productization status is
tracked in `productization-waterline-audit.md`.

Accepted rows:

- System Roles Admin live-only
- System Users Admin live-only
- System Config Admin live-only
- System Notices Admin live-only
- System Files Admin live-only
- System Permissions Admin live-only
- System Posts Admin live-only

Full `Meets` requires live API, live SDK, live-only Admin, Permission/Menu,
Seed/Migration, OpenAPI, local smoke, public API smoke, public Admin smoke,
bundle marker smoke where applicable and deploy guard. Admin fixture fallback
or missing public smoke disqualifies full `Meets`.

## Guarded Failures

Repeated failures were moved into tests, smoke or deploy guards:

- Duplicate `/api/api` login path.
- Stale Admin bundles and retired service worker/cache behavior.
- Revoked, expired or unknown session/token behavior.
- Deserialization drift, including vault envelope compatibility.
- Notice outbox state transitions, retry scheduling, callback signing,
  provider adapters and Admin live-only markers.
- Admin fixture fallback across System, Security, Monitor, Tools,
  Collaboration and Integration pages.
- Config/KMS secret redaction and no plaintext storage.
- Monitor job/cache/status/version/queue live operator surfaces.
- OpenForge dry-run/write-intent boundaries.
- Public smoke semantics: printed URL and bundle marker checks are not public
  API/Admin verification.

## Rework Lessons

- A minimal stage is not a minimal product. A stage can be small, but the
  product area may need consecutive stages until it reaches the agreed
  waterline.
- Queue creation, provider execution, callbacks and retry scheduling are
  separate states.
- Admin pages must fail visibly when their API fails. They must not silently
  render fixtures.
- Do not run Admin `typecheck` and `lint` concurrently when generated types are
  involved.
- Code changes should land with relevant tests, smoke/deploy guards and docs
  in one commit when they describe the same functional change.

## Documentation Finding

The low-signal documents were per-round reports, copied command lists, smoke
transcripts and repeated reference disclaimers. Durable docs should keep only:

- current state,
- source-of-truth links,
- acceptance matrix,
- waterline and debt,
- guardrails,
- actual incident decisions,
- explicit out-of-scope boundaries.

Detailed round history belongs in `round-history.md` and `ledger.md`. Command
output belongs in CI logs, smoke scripts, deployment logs or final responses,
not repeated across strategy docs.

## Non-Claims

Cycle-021 closure does not admit or complete CRM, ERP, MES, WMS, mall, member,
real payment/refund/reconciliation, production multi-tenancy, BPMN/full
workflow, full report designer, big-data async export, AI/RAG/Agent or
OpenForge direct schema/migration/business-code writing.
