# cycle-021 Reference Comparison

Date: 2026-06-13

Reference comparison is capability-based, not commit-count based. OpenCore
should translate stable enterprise admin foundations into its own API, SDK,
Admin, permission, seed, OpenAPI and smoke boundaries.

## Reference Heads

- RuoYi-Vue: `41720e624c5a668c7d3777835e4c87095a7a1dfd`
- Yudao backend: `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb`
- Yudao Admin: `17428e98676c8a626f66da780c7c854c73d6089f`

## Rules

- Compare product capabilities and operator workflows, not raw commit volume.
- Keep OpenCore-native boundaries: package-owned runtime, typed SDK, Umi
  Admin, OpenAPI snapshots and smoke/deploy guards.
- A minimal loop is one deployable stage, not permission to leave the product
  thin forever.
- State admitted boundary and remaining debt once; do not repeat parity
  disclaimers every round.

## Coverage

- System/RBAC: menu, role, permission, user, dept, post, dict and config are
  live with multiple hardening stages.
- Auth/session: login policy, logout, force logout, online-user kick-out and
  token/session revocation are real behavior.
- Logs: login-log has schema, lockout, cleanup, actor/reason and location;
  operation-log has list/detail/export/delete/clean.
- Notice: management, inbox/read analytics, templates, delivery records, local
  provider, Integration outbox bridge, state sync, queued processing and signed
  callback intake plus retry scheduling, SMS HTTP adapter, SMTP adapter and
  mail subject persistence and provider diagnostics are live.
- Config: runtime keys, login policy, feature flags, rollout, audience rules
  and secret-vault encryption are live.
- Monitor/OpenForge/Scheduler: Monitor Jobs now has a live Admin operation
  surface, registry visibility and registered handler diagnostics; external
  worker/cron parity remains.

## Recent Decisions

- Round 67: queue insertion is `pending`, not provider `sent`; retry and
  provider success/failure are explicit state transitions.
- Round 68: operation-log cleanup is a privileged maintenance action and the
  cleanup request itself remains audited.
- Round 69: provider execution is distinct from queue creation; processing
  enabled queued outbox rows moves notice delivery to `sent`.
- Round 70: provider callbacks are signed, ownership-checked and reuse the
  same sent/failed sync paths. Public anonymous webhooks wait for a general
  public-route policy.
- Round 71: retry scheduling is explicit and bounded; failed outbox rows only
  return to queue when provider/channel validation passes and retry caps allow
  it.
- Round 72: SMS HTTP delivery is bounded by endpoint allowlisting, safe request
  config and explicit non-2xx failure sync.
- Round 73: SMTP delivery uses config-vault password resolution and explicit
  SMTP success/failure state sync.
- Round 74: Monitor Jobs moved from fixture-only Admin display to live
  enable/disable/manual-trigger/run-log operations, and operations summary
  gained the missing report migration/seed guard.
- Round 75: Monitor Jobs trigger registered handlers, expose handler registry
  visibility and record retry/duration/failed run diagnostics.
- Round 76: Mail outbox subject is a first-class persisted field; SMTP sends
  that field and no longer infers subject from payload.
- Round 77: Provider diagnostics expose readiness, config-vault hints, outbox
  backlog, last failure and operator actions through API/SDK/Admin.

## Explicit Non-Claims

Explicit user admission is still required for production multi-tenancy,
BPMN/full workflow, full report designer, real payment/refund/reconciliation,
CRM/ERP/MES/WMS/mall/member suites, real external notification provider fleet
and AI/RAG/Agent workflow.

## Next Focus

Choose one foundation stage from notice realtime, SMTP STARTTLS/attachments,
config governance, operation-log enrichment, OpenForge Admin or integration
health/config audit.
